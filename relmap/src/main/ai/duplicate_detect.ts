// 重复联系人检测模块
// 基于 Levenshtein 距离计算字符串相似度，全手写算法，无外部依赖

import { getDb } from '../db/connection'
import type { Result } from '../../shared/types'

// 单个重复候选
export interface DuplicateCandidate {
  person_id: string
  person_name: string
  similarity: number // 0-1
  reasons: string[] // 匹配原因
}

// 重复检测结果
export interface DuplicateResult {
  new_person: { name: string; company?: string; phone?: string; email?: string }
  duplicates: DuplicateCandidate[]
}

// 数据库中已有联系人信息（含 phone/email 从 social_accounts 汇总）
interface PersonRow {
  id: string
  name: string
  company?: string | null
}

interface SocialRow {
  person_id: string
  platform: string
  account_id: string
}

/**
 * 计算 Levenshtein 编辑距离
 * 两字符串之间最少单字符编辑（插入、删除、替换）操作次数
 *
 * @param a 字符串 a
 * @param b 字符串 b
 * @returns 编辑距离（非负整数）
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const lenA = a.length
  const lenB = b.length

  // 使用单行滚动数组优化空间复杂度为 O(min(lenA, lenB))
  // 为效率，确保内层循环走较短串
  if (lenA < lenB) {
    return levenshteinDistance(b, a)
  }

  // prev 表示上一行，curr 表示当前行
  let prev = new Array<number>(lenB + 1)
  let curr = new Array<number>(lenB + 1)

  // 初始化第一行：从空串到 b[0..j] 的距离为 j
  for (let j = 0; j <= lenB; j++) {
    prev[j] = j
  }

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i // 从 a[0..i] 到空串的距离为 i
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const del = prev[j] + 1 // 删除
      const ins = curr[j - 1] + 1 // 插入
      const sub = prev[j - 1] + cost // 替换
      curr[j] = Math.min(del, ins, sub)
    }
    // 交换 prev 和 curr
    const tmp = prev
    prev = curr
    curr = tmp
  }

  return prev[lenB]
}

/**
 * 计算字符串相似度（0-1，1 表示完全相同）
 * 基于 Levenshtein 距离归一化
 *
 * @param a 字符串 a
 * @param b 字符串 b
 * @returns 相似度 0-1
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1

  const dist = levenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  return 1 - dist / maxLen
}

/**
 * 标准化电话号码：去除空格、横线、括号、加号等，仅保留数字
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()+]/g, '')
}

/**
 * 标准化邮箱：转小写并去除首尾空白
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * 检测新联系人与已有联系人的重复
 *
 * 匹配规则：
 * - 姓名相似度 > 0.8 → 可能重复
 * - 电话号码完全匹配 → 高度可能重复
 * - 邮箱完全匹配 → 高度可能重复
 * - 姓名+公司都相似 → 可能重复
 * 综合相似度 = max(各维度相似度加权)
 * 只返回 similarity > 0.5 的候选
 *
 * @param newPerson 新联系人信息
 */
export function detectDuplicates(newPerson: {
  name: string
  company?: string
  phone?: string
  email?: string
}): Result<DuplicateResult> {
  try {
    if (!newPerson || !newPerson.name) {
      return { success: false, error: '联系人姓名不能为空' }
    }

    const db = getDb()

    // 查询所有联系人（含已归档，避免漏判）


    // 查询所有 social_accounts，按 person_id 聚合 phone/email
    // platform 字段约定：'phone'/'email'/'wechat'/'qq' 等
    // MED-007: 使用 platform_lower 生成列命中索引，避免 lower(platform) 导致索引失效
    const socialRows = db
      .prepare(
        `SELECT person_id, platform, account_id
         FROM social_accounts
         WHERE platform_lower IN ('phone', 'mobile', 'tel', 'email', 'mail')`,
      )
      .all() as SocialRow[]

    // 构建 person_id -> { phone, email } 映射
    const contactMap = new Map<string, { phone?: string; email?: string }>()
    for (const s of socialRows) {
      const lower = s.platform.toLowerCase()
      const entry = contactMap.get(s.person_id) ?? {}
      if (lower === 'email' || lower === 'mail') {
        if (!entry.email) entry.email = s.account_id
      } else {
        // phone/mobile/tel 归类为电话
        if (!entry.phone) entry.phone = s.account_id
      }
      contactMap.set(s.person_id, entry)
    }

    // 新联系人的标准化字段
    const newName = newPerson.name.trim()
    const newCompany = newPerson.company?.trim() || ''
    const newPhone = newPerson.phone ? normalizePhone(newPerson.phone) : ''
    const newEmail = newPerson.email ? normalizeEmail(newPerson.email) : ''

    // 获取总联系人数量
    const totalCount = (db.prepare('SELECT COUNT(*) AS cnt FROM persons').get() as { cnt: number }).cnt

    // AI-P1-002: 分页处理，避免全量加载
    // 分批处理联系人，每批 500 人，最多处理 10000 人
    const BATCH_SIZE = 500
    const MAX_PERSONS = 10000
    const duplicates: DuplicateCandidate[] = []

    for (let offset = 0; offset < Math.min(totalCount, MAX_PERSONS); offset += BATCH_SIZE) {
      const persons = db
        .prepare('SELECT id, name, company FROM persons ORDER BY id LIMIT ? OFFSET ?')
        .all(BATCH_SIZE, offset) as PersonRow[]

      for (const p of persons) {
        const reasons: string[] = []
        let maxSim = 0

        // ---- 维度1：姓名相似度 ----
        const nameSim = stringSimilarity(newName, p.name || '')
        if (nameSim > 0.8) {
          reasons.push('姓名相似')
          // 姓名相似度权重 0.5
          maxSim = Math.max(maxSim, nameSim * 0.5)
        }

        // ---- 维度2：电话号码完全匹配 ----
        const existContact = contactMap.get(p.id)
        if (newPhone && existContact?.phone) {
          const existPhone = normalizePhone(existContact.phone)
          if (newPhone && existPhone && newPhone === existPhone) {
            reasons.push('电话号码匹配')
            // 电话完全匹配视为高度重复，权重 1.0
            maxSim = Math.max(maxSim, 1.0)
          }
        }

        // ---- 维度3：邮箱完全匹配 ----
        if (newEmail && existContact?.email) {
          const existEmail = normalizeEmail(existContact.email)
          if (newEmail && existEmail && newEmail === existEmail) {
            reasons.push('邮箱匹配')
            // 邮箱完全匹配视为高度重复，权重 1.0
            maxSim = Math.max(maxSim, 1.0)
          }
        }

        // ---- 维度4：姓名+公司都相似 ----
        if (newCompany && p.company) {
          const companySim = stringSimilarity(newCompany, p.company)
          if (nameSim > 0.6 && companySim > 0.6) {
            reasons.push('姓名和公司都相似')
            // 姓名公司双匹配权重 0.7
            const combined = Math.max(nameSim, companySim) * 0.7
            maxSim = Math.max(maxSim, combined)
          }
        }

        // 只返回 similarity > 0.5 的候选
        if (maxSim > 0.5 && reasons.length > 0) {
          duplicates.push({
            person_id: p.id,
            person_name: p.name,
            similarity: Math.round(maxSim * 100) / 100, // 保留两位小数
            reasons,
          })
        }
      }
    }

    // 按相似度降序排序
    duplicates.sort((a, b) => b.similarity - a.similarity)

    return {
      success: true,
      data: {
        new_person: {
          name: newName,
          company: newCompany || undefined,
          phone: newPerson.phone,
          email: newPerson.email,
        },
        duplicates,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}



