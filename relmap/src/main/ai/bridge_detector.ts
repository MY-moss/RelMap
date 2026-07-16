import { getDb } from '../db/connection'
import { logger } from '../../../electron/logger'
import type { Result, BridgePerson } from '../../shared/types'

export function buildAdjacencyList(edges: { source: string; target: string }[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    if (!adj.has(e.target)) adj.set(e.target, [])
    adj.get(e.source)!.push(e.target)
    adj.get(e.target)!.push(e.source)
  }
  return adj
}

export function bfsShortestPaths(adj: Map<string, string[]>, source: string): Map<string, number> {
  const dist = new Map<string, number>()
  const queue: string[] = [source]
  dist.set(source, 0)
  while (queue.length > 0) {
    const u = queue.shift()!
    const d = dist.get(u)!
    const neighbors = adj.get(u) || []
    for (const v of neighbors) {
      if (!dist.has(v)) {
        dist.set(v, d + 1)
        queue.push(v)
      }
    }
  }
  return dist
}

export function detectBridges(topN: number = 10): Result<BridgePerson[]> {
  const TIMEOUT_MS = 10000 // 10 second timeout
  try {
    const db = getDb()

    const rows = db
      .prepare(`
        SELECT r.person_id AS source, r.related_person_id AS target
        FROM relationships r
        WHERE r.person_id != r.related_person_id
      `)
      .all() as { source: string; target: string }[]

    const edges: { source: string; target: string }[] = rows

    if (edges.length === 0) {
      return { success: true, data: [] }
    }

    const adj = buildAdjacencyList(edges)
    const nodes = Array.from(adj.keys())
    // Limit to 500 nodes to prevent O(n^3) timeout
    if (nodes.length > 500) {
      logger.warn('[Bridge] 图节点数过多(' + nodes.length + ')，限制到500个节点')
      nodes.length = 500
    }

    const betweenness = new Map<string, number>()
    for (const node of nodes) {
      betweenness.set(node, 0)
    }

    const startTime = Date.now()
    for (const s of nodes) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        logger.warn('[Bridge] 桥接检测超时，返回部分结果')
        break
      }
      const dist = bfsShortestPaths(adj, s)

      const stack: string[] = []
      const predecessors = new Map<string, string[]>()
      const sigma = new Map<string, number>()

      for (const node of nodes) {
        predecessors.set(node, [])
        sigma.set(node, 0)
      }
      sigma.set(s, 1)

      const sortedByDist = Array.from(nodes)
        .filter((n) => dist.has(n))
        .sort((a, b) => (dist.get(a) || 0) - (dist.get(b) || 0))

      for (const v of sortedByDist) {
        stack.push(v)
        const neighbors = adj.get(v) || []
        for (const w of neighbors) {
          const dw = dist.get(w)
          const dv = dist.get(v)
          if (dw !== undefined && dv !== undefined && dw === dv + 1) {
            sigma.set(w, (sigma.get(w) || 0) + (sigma.get(v) || 0))
            predecessors.get(w)!.push(v)
          }
        }
      }

      const delta = new Map<string, number>()
      for (const node of nodes) delta.set(node, 0)

      while (stack.length > 0) {
        const w = stack.pop()!
        for (const v of predecessors.get(w) || []) {
          const sv = sigma.get(v) || 0
          const sw = sigma.get(w) || 0
          if (sw > 0) {
            delta.set(v, (delta.get(v) || 0) + (sv / sw) * (1 + (delta.get(w) || 0)))
          }
        }
        if (w !== s) {
          betweenness.set(w, (betweenness.get(w) || 0) + (delta.get(w) || 0))
        }
      }
    }

    const personNames = new Map<string, string>()
    const nameRows = db
      .prepare('SELECT id, name FROM persons WHERE id IN (' + nodes.map(() => '?').join(',') + ')')
      .all(...nodes) as { id: string; name: string }[]
    for (const r of nameRows) {
      personNames.set(r.id, r.name)
    }

    const result: BridgePerson[] = Array.from(betweenness.entries())
      .filter(([id]) => personNames.has(id))
      .map(([personId, score]) => ({
        personId,
        personName: personNames.get(personId) || '未知',
        betweennessScore: Math.round(score * 100) / 100,
        connects: adj.get(personId)?.length || 0,
      }))
      .sort((a, b) => b.betweennessScore - a.betweennessScore)
      .slice(0, topN)

    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
