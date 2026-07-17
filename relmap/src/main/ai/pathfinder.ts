import { getDb } from '../db/connection'
import { logger } from '../../../electron/logger'
import type { Result, PathStep, PathResult } from '../../shared/types'

function buildAdjacencyList(edges: { source: string; target: string }[]): Map<string, Map<string, string>> {
  const adj = new Map<string, Map<string, string>>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Map())
    if (!adj.has(e.target)) adj.set(e.target, new Map())
    adj.get(e.source)!.set(e.target, '')
    adj.get(e.target)!.set(e.source, '')
  }
  return adj
}

function findAllShortestPaths(
  adj: Map<string, Map<string, string>>,
  source: string,
  target: string,
  maxPaths: number = 5
): string[][] {
  if (source === target) return [[source]]
  const result: string[][] = []
  const shortestLenRef = { value: Infinity }
  const queue: { node: string; path: string[] }[] = [{ node: source, path: [source] }]
  const visitedAtDepth = new Map<string, number>()
  visitedAtDepth.set(source, 0)
  while (queue.length > 0) {
    const { node, path } = queue.shift()!
    if (path.length > shortestLenRef.value) continue
    const neighbors = adj.get(node)
    if (!neighbors) continue
    for (const neighbor of neighbors.keys()) {
      if (neighbor === target) {
        const fullPath = [...path, neighbor]
        if (fullPath.length < shortestLenRef.value) {
          shortestLenRef.value = fullPath.length
          result.length = 0
        }
        if (fullPath.length === shortestLenRef.value) {
          result.push(fullPath)
        }
        if (result.length >= maxPaths) return result
        continue
      }
      const depth = path.length
      const prevDepth = visitedAtDepth.get(neighbor)
      if (prevDepth !== undefined && prevDepth < depth + 1) continue
      visitedAtDepth.set(neighbor, depth + 1)
      queue.push({ node: neighbor, path: [...path, neighbor] })
    }
  }
  return result
}

export function findPath(aId: string, bId: string, maxPaths: number = 5): Result<PathResult> {
  try {
    const db = getDb()
    const rows = db
      .prepare(`
        SELECT r.person_id AS source, r.related_person_id AS target, r.relation_label, r.intimacy
        FROM relationships r
        WHERE r.person_id != r.related_person_id
      `)
      .all() as { source: string; target: string; relation_label: string | null; intimacy: number }[]

    const edges = rows.map(r => ({ source: r.source, target: r.target, label: r.relation_label ?? '', intimacy: r.intimacy }))
    const adj = buildAdjacencyList(edges)

    const shortAdj = new Map<string, Map<string, string>>()
    for (const [k, v] of adj) {
      shortAdj.set(k, new Map(v))
    }

    const paths = findAllShortestPaths(shortAdj, aId, bId, maxPaths)

    if (paths.length === 0) {
      return { success: true, data: { found: false, paths: [] } }
    }

    const personIds = new Set<string>()
    for (const path of paths) {
      for (const id of path) personIds.add(id)
    }

    const nameRows = db
      .prepare('SELECT id, name, avatar_path FROM persons WHERE id IN (' + Array.from(personIds).map(() => '?').join(',') + ')')
      .all(...Array.from(personIds)) as { id: string; name: string; avatar_path: string | null }[]
    const nameMap = new Map(nameRows.map(r => [r.id, { name: r.name, avatarPath: r.avatar_path }]))

    const edgeMap = new Map<string, { label: string; intimacy: number }>()
    for (const e of edges) {
      edgeMap.set(`${e.source}|${e.target}`, { label: e.label, intimacy: e.intimacy })
      edgeMap.set(`${e.target}|${e.source}`, { label: e.label, intimacy: e.intimacy })
    }

    const pathResults: PathStep[][] = paths.map(path => {
      const steps: PathStep[] = []
      for (let i = 0; i < path.length; i++) {
        const info = nameMap.get(path[i])
        steps.push({
          personId: path[i],
          personName: info?.name ?? '未知',
          avatarPath: info?.avatarPath ?? null,
        })
        if (i < path.length - 1) {
          const edgeKey = `${path[i]}|${path[i + 1]}`
          const edgeInfo = edgeMap.get(edgeKey)
          steps[steps.length - 1].relationLabel = edgeInfo?.label ?? null
          steps[steps.length - 1].relationIntimacy = edgeInfo?.intimacy ?? 0
        }
      }
      return steps
    })

    return {
      success: true,
      data: {
        found: true,
        paths: pathResults,
        totalPaths: paths.length,
      },
    }
  } catch (e) {
    logger.error({ err: e }, '[Pathfinder] 查找路径失败')
    return { success: false, error: (e as Error).message }
  }
}
