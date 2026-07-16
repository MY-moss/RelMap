import { getDb } from '../connection'
import type {
  Result,
  LifecycleDistribution,
  MonthlyTrend,
  NetworkStats,
  TopPurpose,
  ContactGrowth,
  InteractionHeatmapItem,
  ActivityDistribution,
  TopRelationship,
} from '../../../shared/types'

export function getLifecycleDistribution(): Result<LifecycleDistribution[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT lifecycle_stage AS stage, COUNT(*) AS count
         FROM persons
         WHERE is_archived = 0 AND lifecycle_stage IS NOT NULL
         GROUP BY lifecycle_stage
         ORDER BY count DESC`,
      )
      .all() as { stage: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getMonthlyInteractionTrend(months: number): Result<MonthlyTrend[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', interact_at) AS month, COUNT(*) AS count
         FROM interaction_logs
         WHERE interact_at >= date('now', ? || ' months', 'start of month')
         GROUP BY month
         ORDER BY month`,
      )
      .all(`-${months}`) as { month: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getNetworkStats(): Result<NetworkStats> {
  try {
    const db = getDb()

    const nodeRow = db
      .prepare('SELECT COUNT(*) AS cnt FROM persons WHERE is_archived = 0')
      .get() as { cnt: number }
    const edgeRow = db
      .prepare('SELECT COUNT(*) AS cnt FROM relationships')
      .get() as { cnt: number }
    const avgRow = db
      .prepare('SELECT AVG(intimacy) AS avg FROM relationships')
      .get() as { avg: number | null }

    const totalNodes = nodeRow?.cnt ?? 0
    const totalEdges = edgeRow?.cnt ?? 0
    const avgIntimacy = avgRow?.avg != null ? Math.round(avgRow.avg * 10) / 10 : 0
    const density =
      totalNodes > 1
        ? Math.round((totalEdges * 2) / (totalNodes * (totalNodes - 1)) * 10000) / 10000
        : 0

    let connectedComponents = totalNodes
    if (totalEdges > 0 && totalNodes > 0) {
      const relRows = db
        .prepare('SELECT person_id, related_person_id FROM relationships')
        .all() as { person_id: string; related_person_id: string }[]

      const parent = new Map<string, string>()
      const find = (x: string): string => {
        if (!parent.has(x)) parent.set(x, x)
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
        return parent.get(x)!
      }
      const union = (a: string, b: string) => {
        const ra = find(a)
        const rb = find(b)
        if (ra !== rb) parent.set(ra, rb)
      }

      for (const r of relRows) {
        union(r.person_id, r.related_person_id)
      }

      const roots = new Set<string>()
      for (const r of relRows) {
        roots.add(find(r.person_id))
        roots.add(find(r.related_person_id))
      }
      connectedComponents = roots.size
      const nodesInRelations = roots.size
      connectedComponents = nodesInRelations + (totalNodes - nodesInRelations)
    }

    return {
      success: true,
      data: { totalNodes, totalEdges, connectedComponents, avgIntimacy, density },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getTopPurposes(): Result<TopPurpose[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT purpose, COUNT(*) AS count
         FROM interaction_logs
         WHERE purpose IS NOT NULL AND purpose != ''
         GROUP BY purpose
         ORDER BY count DESC
         LIMIT 10`,
      )
      .all() as { purpose: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getContactGrowth(months: number): Result<ContactGrowth[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
         FROM persons
         WHERE created_at >= date('now', ? || ' months', 'start of month')
         GROUP BY month
         ORDER BY month`,
      )
      .all(`-${months}`) as { month: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getInteractionHeatmap(months: number): Result<InteractionHeatmapItem[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT substr(interact_at, 1, 10) AS date, COUNT(*) AS count
         FROM interaction_logs
         WHERE interact_at >= date('now', ? || ' months')
         GROUP BY date
         ORDER BY date`,
      )
      .all(`-${months}`) as { date: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getActivityDistribution(): Result<ActivityDistribution[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT interact_type AS type, COUNT(*) AS count
         FROM interaction_logs
         GROUP BY type
         ORDER BY count DESC`,
      )
      .all() as { type: string; count: number }[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getTopRelationships(limit: number): Result<TopRelationship[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT r.id, r.intimacy, r.relation_label,
                p1.name AS person_name,
                p2.name AS related_person_name
         FROM relationships r
         JOIN persons p1 ON r.person_id = p1.id
         JOIN persons p2 ON r.related_person_id = p2.id
         ORDER BY r.intimacy DESC
         LIMIT ?`,
      )
      .all(limit) as TopRelationship[]
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
