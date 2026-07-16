// 智能分组建议模块
// 基于 K-Means 简化版思路，按多维度特征对联系人进行自动分组建议
// 维度：公司 / 标签 / 亲密度 / 关系网络（连通分量）

import { getDb } from '../db/connection'
import type { Result } from '../../shared/types'

// 智能分组建议
export interface GroupSuggestion {
  group_name: string         // 建议的分组名称
  group_color: string        // 建议的分组颜色
  person_ids: string[]       // 包含的联系人ID
  reason: string             // 分组理由
  similarity: number         // 平均相似度 0-1
}

// 智能分组结果
export interface SmartGroupingResult {
  suggestions: GroupSuggestion[]
  total_persons: number
  grouped_persons: number
  ungrouped_persons: number
}

// 分组颜色常量
const COLOR_COMPANY = '#3b82f6'   // 公司组-蓝色
const COLOR_TAG = '#10b981'       // 标签组-绿色
const COLOR_INTIMACY = '#f59e0b'  // 亲密度组-橙色
const COLOR_NETWORK = '#8b5cf6'   // 关系网络组-紫色

// 最小分组人数（公司/标签/亲密度维度）
const MIN_GROUP_SIZE = 2

// Louvain 算法参数
const LOUVAIN_RESOLUTION = 1.0
const LOUVAIN_MAX_ITERATIONS = 100
const MIN_COMMUNITY_SIZE = 3

interface PersonRow {
  id: string
  name: string
  company: string | null
}

interface TaggingRow {
  tag_id: string
  tag_name: string
  tag_color: string
  target_id: string
}

interface IntimacyRow {
  person_id: string
  related_person_id: string
  intimacy: number
}

/**
 * 维度1：按公司分组
 * 在内存中对已加载的 persons 数据按 company 字段分组，每个非空公司生成一个分组建议
 * 相似度 1.0（完全匹配），只保留人数 >= 2 的分组
 *
 * MED-015: 改为接收内存数据，避免独立全表扫描
 */
function groupByCompany(allPersons: PersonRow[]): GroupSuggestion[] {
  // 按公司分组（在内存中过滤和分组）
  const companyMap = new Map<string, string[]>()
  for (const row of allPersons) {
    const company = (row.company ?? '').trim()
    if (!company) continue
    const list = companyMap.get(company) ?? []
    list.push(row.id)
    companyMap.set(company, list)
  }

  const suggestions: GroupSuggestion[] = []
  for (const [company, ids] of companyMap) {
    if (ids.length < MIN_GROUP_SIZE) continue
    suggestions.push({
      group_name: `${company}-同事`,
      group_color: COLOR_COMPANY,
      person_ids: ids,
      reason: `均来自「${company}」`,
      similarity: 1.0,
    })
  }
  return suggestions
}

/**
 * 维度2：按标签分组
 * 在内存中对已加载的 taggings 数据按标签关联的 person 聚合
 * 相似度 1.0，只保留人数 >= 2 的分组
 *
 * MED-015: 改为接收内存数据，避免独立全表扫描
 */
function groupByTag(allTaggings: TaggingRow[]): GroupSuggestion[] {
  // 按标签分组，使用 Set 去重同一标签下重复关联的联系人
  const tagMap = new Map<string, { name: string; color: string; ids: Set<string> }>()
  for (const row of allTaggings) {
    const entry = tagMap.get(row.tag_id) ?? {
      name: row.tag_name,
      color: row.tag_color,
      ids: new Set<string>(),
    }
    entry.ids.add(row.target_id)
    tagMap.set(row.tag_id, entry)
  }

  const suggestions: GroupSuggestion[] = []
  for (const [, entry] of tagMap) {
    const ids = Array.from(entry.ids)
    if (ids.length < MIN_GROUP_SIZE) continue
    suggestions.push({
      group_name: entry.name,
      group_color: COLOR_TAG,
      person_ids: ids,
      reason: `共享标签「${entry.name}」`,
      similarity: 1.0,
    })
  }
  return suggestions
}

/**
 * 维度3：按亲密度分组
 * 获取每个联系人在 relationships 表中的最大 intimacy 值
 * 分三档：高(71-100)、中(31-70)、低(0-30)
 * 相似度 0.7（基于分档）
 */
function groupByIntimacy(relationshipsRows?: IntimacyRow[]): GroupSuggestion[] {
  const rows = relationshipsRows ?? (() => {
    const db = getDb()
    return db.prepare('SELECT person_id, related_person_id, intimacy FROM relationships').all() as IntimacyRow[]
  })()

  // 每个联系人（作为 person_id 或 related_person_id）的最大 intimacy
  const intimacyMap = new Map<string, number>()
  for (const row of rows) {
    const updateMax = (pid: string) => {
      const cur = intimacyMap.get(pid) ?? -1
      if (row.intimacy > cur) intimacyMap.set(pid, row.intimacy)
    }
    updateMax(row.person_id)
    updateMax(row.related_person_id)
  }

  // 分三档
  const buckets: Record<string, string[]> = { high: [], mid: [], low: [] }
  for (const [pid, intimacy] of intimacyMap) {
    if (intimacy >= 71) buckets.high.push(pid)
    else if (intimacy >= 31) buckets.mid.push(pid)
    else buckets.low.push(pid)
  }

  const defs: { key: string; name: string; reason: string }[] = [
    { key: 'high', name: '亲密联系人', reason: '亲密度 71-100，关系紧密' },
    { key: 'mid', name: '普通联系人', reason: '亲密度 31-70，保持联系' },
    { key: 'low', name: '疏远联系人', reason: '亲密度 0-30，需要激活' },
  ]

  const suggestions: GroupSuggestion[] = []
  for (const def of defs) {
    const ids = buckets[def.key]
    if (ids.length < MIN_GROUP_SIZE) continue
    suggestions.push({
      group_name: def.name,
      group_color: COLOR_INTIMACY,
      person_ids: ids,
      reason: def.reason,
      similarity: 0.7,
    })
  }
  return suggestions
}

/**
 * 维度4：按关系网络分组（Louvain 社区发现算法）
 * 构建 weighted 无向图（intimacy 作为权重归一化到 0-1），
 * 使用 Louvain 算法进行层次化社区检测，基于模块度优化
 */
function groupByNetworkLouvain(relationshipsRows: IntimacyRow[]): GroupSuggestion[] {
  // 构建加权无向图
  const adj = new Map<string, Map<string, number>>()
  const ensureNode = (id: string) => {
    if (!adj.has(id)) adj.set(id, new Map<string, number>())
  }
  for (const row of relationshipsRows) {
    const w = row.intimacy / 100
    ensureNode(row.person_id)
    ensureNode(row.related_person_id)
    adj.get(row.person_id)!.set(row.related_person_id, w)
    adj.get(row.related_person_id)!.set(row.person_id, w)
  }

  const nodes = Array.from(adj.keys())
  if (nodes.length === 0) return []

  // 节点度（关联边权重之和）和总边权重
  const degree = new Map<string, number>()
  let totalEdgeWeight = 0
  for (const [u, neighbors] of adj) {
    let d = 0
    for (const w of neighbors.values()) d += w
    degree.set(u, d)
    totalEdgeWeight += d
  }
  totalEdgeWeight /= 2 // 无向图，每条边被计算两次
  if (totalEdgeWeight === 0) return []

  // 初始化：每个节点独立为一个社区
  const community = new Map<string, string>()
  for (const n of nodes) community.set(n, n)

  // 社区的总度（Σ_tot）
  const commTot = new Map<string, number>()
  for (const [n, cid] of community) {
    commTot.set(cid, (commTot.get(cid) ?? 0) + (degree.get(n) ?? 0))
  }

  // Louvain Phase 1：模块度优化
  let iteration = 0
  while (iteration < LOUVAIN_MAX_ITERATIONS) {
    let improved = false
    for (const node of nodes) {
      const curComm = community.get(node)!
      const deg = degree.get(node) ?? 0
      const neighbors = adj.get(node)!

      // 统计 node 到各邻居社区的边权重和
      const commLinks = new Map<string, number>()
      for (const [nb, w] of neighbors) {
        const nc = community.get(nb)!
        commLinks.set(nc, (commLinks.get(nc) ?? 0) + w)
      }

      const ki_in_A = commLinks.get(curComm) ?? 0
      const stot_A = commTot.get(curComm) ?? 0

      // 尝试将 node 移入每个邻居社区，计算模块度增益
      // ΔQ = (k_i_in_C - k_i_in_A) / m - k_i * (stot_C - stot_A + k_i) / (2 * m²)
      let bestComm = curComm
      let bestGain = 0
      for (const [candComm, ki_in_C] of commLinks) {
        if (candComm === curComm) continue
        const stot_C = commTot.get(candComm) ?? 0
        const gain = (ki_in_C - ki_in_A) / totalEdgeWeight
          - LOUVAIN_RESOLUTION * deg * (stot_C - stot_A + deg) / (2 * totalEdgeWeight * totalEdgeWeight)
        if (gain > bestGain) {
          bestGain = gain
          bestComm = candComm
        }
      }

      if (bestComm !== curComm) {
        improved = true
        community.set(node, bestComm)
        commTot.set(curComm, (commTot.get(curComm) ?? 0) - deg)
        commTot.set(bestComm, (commTot.get(bestComm) ?? 0) + deg)
      }
    }
    if (!improved) break
    iteration++
  }

  // 按社区聚合节点
  const communityMap = new Map<string, string[]>()
  for (const [node, cid] of community) {
    const list = communityMap.get(cid) ?? []
    list.push(node)
    communityMap.set(cid, list)
  }

  // 计算最终模块度 Q = Σ[S_in_C / m - (S_tot_C / (2m))²]
  let modularity = 0
  for (const [cid, members] of communityMap) {
    const tot = commTot.get(cid) ?? 0
    let internal = 0
    for (const u of members) {
      for (const [v, w] of adj.get(u) ?? []) {
        if (u < v && community.get(v) === cid) {
          internal += w
        }
      }
    }
    modularity += internal / totalEdgeWeight
      - LOUVAIN_RESOLUTION * (tot / (2 * totalEdgeWeight)) * (tot / (2 * totalEdgeWeight))
  }

  // 生成分组建议
  const suggestions: GroupSuggestion[] = []
  let index = 0
  for (const [, members] of communityMap) {
    if (members.length < MIN_COMMUNITY_SIZE) continue
    index++
    suggestions.push({
      group_name: `community_${index}`,
      group_color: COLOR_NETWORK,
      person_ids: members,
      reason: `Louvain 社区发现，共 ${members.length} 人 (模块度: ${modularity.toFixed(3)})`,
      similarity: 0.85,
    })
  }
  return suggestions
}

/**
 * 基于多维度特征对联系人进行智能分组
 *
 * 分组维度：
 * 1. 公司：相同公司的联系人自动归为一组
 * 2. 标签：共享相同标签的联系人归为一组
 * 3. 亲密度：亲密度相近的联系人归为一组（高/中/低三档）
 * 4. 关系网络：通过关系图谱的社区检测（简化版连通分量）
 *
 * 结果合并：按相似度降序处理，已在高相似度分组中的联系人不再加入低相似度分组
 */
export function generateGroupSuggestions(): Result<SmartGroupingResult> {
  try {
    const db = getDb()

    // MED-015: 一次性加载所有需要的数据到内存，避免每个分组维度独立全表扫描
    // 原来 4 次查询（COUNT persons + persons + tags JOIN taggings + relationships）合并为 3 次
    // persons 仅扫描一次，同时用于总人数统计和按公司分组
    const allPersons = db
      .prepare('SELECT id, name, company FROM persons')
      .all() as PersonRow[]
    const allTaggings = db
      .prepare(
        `SELECT t.id AS tag_id, t.name AS tag_name, t.color AS tag_color, tg.target_id
         FROM tags t
         JOIN taggings tg ON t.id = tg.tag_id
         WHERE tg.target_type = 'person'`,
      )
      .all() as TaggingRow[]
    const allRelationships = db
      .prepare('SELECT person_id, related_person_id, intimacy FROM relationships')
      .all() as IntimacyRow[]

    const totalPersons = allPersons.length

    // 收集四个维度的分组建议（全部在内存中分组，不再触发额外 SQL 查询）
    const allSuggestions: GroupSuggestion[] = [
      ...groupByCompany(allPersons),
      ...groupByTag(allTaggings),
      ...groupByIntimacy(allRelationships),
      ...groupByNetworkLouvain(allRelationships),
    ]

    // 按相似度降序排序，优先分配高相似度分组
    allSuggestions.sort((a, b) => b.similarity - a.similarity)

    // 去重：已在高相似度分组中的联系人不再加入低相似度分组
    const assigned = new Set<string>()
    const finalSuggestions: GroupSuggestion[] = []
    for (const sug of allSuggestions) {
      const remaining = sug.person_ids.filter((id) => !assigned.has(id))
      if (remaining.length === 0) continue
      finalSuggestions.push({
        ...sug,
        person_ids: remaining,
      })
      for (const id of remaining) assigned.add(id)
    }

    // 最终按相似度降序排序
    finalSuggestions.sort((a, b) => b.similarity - a.similarity)

    const groupedPersons = assigned.size

    return {
      success: true,
      data: {
        suggestions: finalSuggestions,
        total_persons: totalPersons,
        grouped_persons: groupedPersons,
        ungrouped_persons: Math.max(0, totalPersons - groupedPersons),
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

const LOOKUP_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

export function getLouvainCommunities(): Result<Array<{ communityId: number; communityName: string; memberIds: string[]; color: string }>> {
  try {
    const db = getDb()
    const allRelationships = db
      .prepare('SELECT person_id, related_person_id, intimacy FROM relationships')
      .all() as IntimacyRow[]
    const adj = new Map<string, Map<string, number>>()
    const ensureNode = (id: string) => { if (!adj.has(id)) adj.set(id, new Map<string, number>()) }
    for (const row of allRelationships) {
      const w = row.intimacy / 100
      ensureNode(row.person_id); ensureNode(row.related_person_id)
      adj.get(row.person_id)!.set(row.related_person_id, w)
      adj.get(row.related_person_id)!.set(row.person_id, w)
    }
    const nodes = Array.from(adj.keys())
    if (nodes.length === 0) return { success: true, data: [] }

    const degree = new Map<string, number>()
    let totalEdgeWeight = 0
    for (const [u, neighbors] of adj) {
      let d = 0
      for (const w of neighbors.values()) d += w
      degree.set(u, d); totalEdgeWeight += d
    }
    totalEdgeWeight /= 2
    if (totalEdgeWeight === 0) return { success: true, data: [] }

    const community = new Map<string, string>()
    for (const n of nodes) community.set(n, n)
    const commTot = new Map<string, number>()
    for (const [n, cid] of community) commTot.set(cid, (commTot.get(cid) ?? 0) + (degree.get(n) ?? 0))

    let iteration = 0
    while (iteration < LOUVAIN_MAX_ITERATIONS) {
      let improved = false
      for (const node of nodes) {
        const curComm = community.get(node)!
        const deg = degree.get(node) ?? 0
        const neighbors = adj.get(node)!
        const commLinks = new Map<string, number>()
        for (const [nb, w] of neighbors) {
          const nc = community.get(nb)!
          commLinks.set(nc, (commLinks.get(nc) ?? 0) + w)
        }
        const ki_in_A = commLinks.get(curComm) ?? 0
        const stot_A = commTot.get(curComm) ?? 0
        let bestComm = curComm; let bestGain = 0
        for (const [candComm, ki_in_C] of commLinks) {
          if (candComm === curComm) continue
          const stot_C = commTot.get(candComm) ?? 0
          const gain = (ki_in_C - ki_in_A) / totalEdgeWeight
            - LOUVAIN_RESOLUTION * deg * (stot_C - stot_A + deg) / (2 * totalEdgeWeight * totalEdgeWeight)
          if (gain > bestGain) { bestGain = gain; bestComm = candComm }
        }
        if (bestComm !== curComm) {
          improved = true
          community.set(node, bestComm)
          commTot.set(curComm, (commTot.get(curComm) ?? 0) - deg)
          commTot.set(bestComm, (commTot.get(bestComm) ?? 0) + deg)
        }
      }
      if (!improved) break
      iteration++
    }

    const communityMap = new Map<string, string[]>()
    for (const [node, cid] of community) {
      const list = communityMap.get(cid) ?? []
      list.push(node)
      communityMap.set(cid, list)
    }
    let idx = 0
    const result: Array<{ communityId: number; communityName: string; memberIds: string[]; color: string }> = []
    for (const [, members] of communityMap) {
      if (members.length < MIN_COMMUNITY_SIZE) continue
      result.push({
        communityId: idx,
        communityName: `社区 ${idx + 1}`,
        memberIds: members,
        color: LOOKUP_COLORS[idx % LOOKUP_COLORS.length],
      })
      idx++
    }
    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
