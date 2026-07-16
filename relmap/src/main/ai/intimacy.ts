import { getDb } from '../db/connection'
import type { Result, IntimacyScore } from '../../shared/types'

export type { IntimacyScore }

/**
 * 维度1: 交互频率得分
 * 0 条=0，1-5 条=30，6-15 条=60，16-30 条=80，30+ 条=100
 */
export function scoreFrequency(count: number): number {
  if (count === 0) return 0
  if (count <= 5) return 30
  if (count <= 15) return 60
  if (count <= 30) return 80
  return 100
}

/**
 * 维度2: 最近联系时间得分
 * 7 天内=100，30 天内=80，90 天内=60，180 天内=30，180 天以上=10，无记录=0
 */
export function scoreRecency(lastDateStr: string | null): number {
  if (!lastDateStr) return 0
  const lastDate = new Date(lastDateStr)
  if (Number.isNaN(lastDate.getTime())) return 0

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  lastDate.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / msPerDay)

  if (daysSince <= 7) return 100
  if (daysSince <= 30) return 80
  if (daysSince <= 90) return 60
  if (daysSince <= 180) return 30
  return 10
}

/**
 * 计算联系人的四维亲密度评分（同步，基于 better-sqlite3）
 * 优化版：将原来的 5 次独立查询合并为 1 次 JOIN 查询 + 1 次关联查询
 *
 * 维度1 交互频率: interaction_logs 记录数
 * 维度2 最近联系: 最近一次交互日期，无交互记录时回退到最近事件/日记日期
 * 维度3 关系深度: 关联事件数 * 10 + 关联日记数 * 15（上限 100）
 * 维度4 手动设置: relationships 中该联系人作为 person_id 或 related_person_id 的最大 intimacy，无记录默认 50
 *
 * 综合 = frequency * 0.25 + recency * 0.30 + depth * 0.20 + manual * 0.25（四舍五入）
 */
export function calculateIntimacy(personId: string): Result<IntimacyScore> {
  try {
    const db = getDb()

    // 合并 5 次查询为 1 次 JOIN 查询：同时获取交互记录数、最近交互时间、关联事件数、关联日记数
    // AI-P1-003: 使用 LEFT JOIN + 聚合一次性获取所有基础数据
    const baseRow = db
      .prepare(
        `SELECT
          COALESCE(il.cnt, 0) AS interaction_count,
          il.last_interact_at,
          COALESCE(ep.cnt, 0) AS event_count,
          COALESCE(dp.cnt, 0) AS diary_count
        FROM (SELECT 1 AS dummy) AS dummy
        LEFT JOIN (
          SELECT COUNT(*) AS cnt, MAX(interact_at) AS last_interact_at
          FROM interaction_logs WHERE person_id = ?
        ) il ON 1=1
        LEFT JOIN (
          SELECT COUNT(*) AS cnt
          FROM event_persons WHERE person_id = ?
        ) ep ON 1=1
        LEFT JOIN (
          SELECT COUNT(*) AS cnt
          FROM diary_persons WHERE person_id = ?
        ) dp ON 1=1
      `)
      .get(personId, personId, personId) as {
        interaction_count: number
        last_interact_at: string | null
        event_count: number
        diary_count: number
      }

    const interactionCount = baseRow?.interaction_count ?? 0
    const frequency = scoreFrequency(interactionCount)

    // 维度2: 最近联系时间
    let lastDateStr: string | null = baseRow?.last_interact_at ?? null

    // 无交互记录时，回退到最近事件日期或日记日期
    if (!lastDateStr) {
      const fallbackRow = db
        .prepare(
        `SELECT MAX(last_date) AS last_date FROM (
            SELECT MAX(e.event_date) AS last_date
            FROM events e
            JOIN event_persons ep ON e.id = ep.event_id
            WHERE ep.person_id = ?
            UNION ALL
            SELECT MAX(d.diary_date) AS last_date
            FROM diaries d
            JOIN diary_persons dp ON d.id = dp.diary_id
            WHERE dp.person_id = ?
          )`
      ).get(personId, personId) as { last_date: string | null } | undefined
      lastDateStr = fallbackRow?.last_date ?? null
    }

    const recency = scoreRecency(lastDateStr)

    // 维度3: 关系深度
    const eventCount = baseRow?.event_count ?? 0
    const diaryCount = baseRow?.diary_count ?? 0
    const depth = Math.min(eventCount * 10 + diaryCount * 15, 100)

    // 维度4: 手动设置（单独查询，因为涉及 OR 条件比较特殊）
    const manualRow = db
      .prepare(
        `SELECT MAX(intimacy) AS max_intimacy
         FROM relationships
         WHERE person_id = ? OR related_person_id = ?`
      ).get(personId, personId) as { max_intimacy: number | null } | undefined

    const rawManualIntimacy = manualRow?.max_intimacy ?? null
    const manualIntimacy = rawManualIntimacy !== null ? rawManualIntimacy : 50
    const manual = manualIntimacy

    // 综合评分
    const total = Math.round(
      frequency * 0.25 + recency * 0.30 + depth * 0.20 + manual * 0.25,
    )

    const score: IntimacyScore = {
      person_id: personId,
      total,
      dimensions: {
        frequency,
        recency,
        depth,
        manual,
      },
      details: {
        interaction_count: interactionCount,
        last_interaction_date: lastDateStr,
        event_count: eventCount,
        diary_count: diaryCount,
        manual_intimacy: manualIntimacy,
      },
    }

    return { success: true, data: score }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}



