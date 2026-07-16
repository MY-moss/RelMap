import { describe, it, expect } from 'vitest'
import { buildAdjacencyList, bfsShortestPaths } from '../../src/main/ai/bridge_detector'

describe('buildAdjacencyList', () => {
  it('returns empty map for empty edges', () => {
    const adj = buildAdjacencyList([])
    expect(adj.size).toBe(0)
  })

  it('builds adjacency for a single edge', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
    ])
    expect(adj.get('a')).toEqual(['b'])
    expect(adj.get('b')).toEqual(['a'])
  })

  it('builds adjacency for a triangle', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ])
    expect(adj.get('a')?.sort()).toEqual(['b', 'c'])
    expect(adj.get('b')?.sort()).toEqual(['a', 'c'])
    expect(adj.get('c')?.sort()).toEqual(['a', 'b'])
  })

  it('handles nodes with multiple edges', () => {
    const adj = buildAdjacencyList([
      { source: 'center', target: 'a' },
      { source: 'center', target: 'b' },
      { source: 'center', target: 'c' },
    ])
    expect(adj.get('center')?.sort()).toEqual(['a', 'b', 'c'])
    expect(adj.get('a')).toEqual(['center'])
  })

  it('treats edges as undirected', () => {
    const adj = buildAdjacencyList([
      { source: 'x', target: 'y' },
      { source: 'y', target: 'z' },
    ])
    expect(adj.get('x')).toContain('y')
    expect(adj.get('y')).toContain('x')
    expect(adj.get('y')).toContain('z')
    expect(adj.get('z')).toContain('y')
  })
})

describe('bfsShortestPaths', () => {
  it('finds distance 0 from source to itself', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
    ])
    const dist = bfsShortestPaths(adj, 'a')
    expect(dist.get('a')).toBe(0)
  })

  it('finds distance 1 to direct neighbors', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
    ])
    const dist = bfsShortestPaths(adj, 'a')
    expect(dist.get('b')).toBe(1)
  })

  it('finds shortest path in a chain', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'd' },
    ])
    const dist = bfsShortestPaths(adj, 'a')
    expect(dist.get('a')).toBe(0)
    expect(dist.get('b')).toBe(1)
    expect(dist.get('c')).toBe(2)
    expect(dist.get('d')).toBe(3)
  })

  it('finds shortest path vs alternative longer path', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'd' },
      { source: 'a', target: 'd' }, // direct edge a-d
    ])
    const dist = bfsShortestPaths(adj, 'a')
    // Direct edge a-d is shorter than a-b-c-d
    expect(dist.get('d')).toBe(1)
    expect(dist.get('b')).toBe(1)
    expect(dist.get('c')).toBe(2)
  })

  it('does not reach disconnected nodes', () => {
    const adj = buildAdjacencyList([
      { source: 'a', target: 'b' },
      { source: 'c', target: 'd' },
    ])
    const dist = bfsShortestPaths(adj, 'a')
    expect(dist.has('c')).toBe(false)
    expect(dist.has('d')).toBe(false)
  })
})

describe('Betweenness Centrality (integrated)', () => {
  function betweennessCentrality(edges: { source: string; target: string }[]): Map<string, number> {
    const adj = buildAdjacencyList(edges)
    const nodes = Array.from(adj.keys())
    const bc = new Map<string, number>()
    for (const n of nodes) bc.set(n, 0)

    for (const s of nodes) {
      const dist = bfsShortestPaths(adj, s)
      const stack: string[] = []
      const predecessors = new Map<string, string[]>()
      const sigma = new Map<string, number>()
      for (const n of nodes) {
        predecessors.set(n, [])
        sigma.set(n, 0)
      }
      sigma.set(s, 1)

      const sorted = Array.from(nodes).filter(n => dist.has(n)).sort((a, b) => (dist.get(a) || 0) - (dist.get(b) || 0))

      for (const v of sorted) {
        stack.push(v)
        for (const w of adj.get(v) || []) {
          const dw = dist.get(w)
          const dv = dist.get(v)
          if (dw !== undefined && dv !== undefined && dw === dv + 1) {
            sigma.set(w, (sigma.get(w) || 0) + (sigma.get(v) || 0))
            predecessors.get(w)!.push(v)
          }
        }
      }

      const delta = new Map<string, number>()
      for (const n of nodes) delta.set(n, 0)

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
          bc.set(w, (bc.get(w) || 0) + (delta.get(w) || 0))
        }
      }
    }
    return bc
  }

  it('produces zero betweenness for a triangle', () => {
    const bc = betweennessCentrality([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ])
    const values = Array.from(bc.values())
    expect(values.every(v => v === 0)).toBe(true)
  })

  it('center node has highest betweenness in star graph', () => {
    const bc = betweennessCentrality([
      { source: 'center', target: 'a' },
      { source: 'center', target: 'b' },
      { source: 'center', target: 'c' },
    ])
    expect((bc.get('center') ?? 0)).toBeGreaterThan(0)
    expect((bc.get('a') ?? 0)).toBe(0)
    expect((bc.get('b') ?? 0)).toBe(0)
    expect((bc.get('c') ?? 0)).toBe(0)
  })

  it('middle node has highest betweenness in a path', () => {
    const bc = betweennessCentrality([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ])
    expect((bc.get('b') ?? 0)).toBeGreaterThan((bc.get('a') ?? 0))
    expect((bc.get('b') ?? 0)).toBeGreaterThan((bc.get('c') ?? 0))
  })

  it('bridge node has highest betweenness in two communities', () => {
    const bc = betweennessCentrality([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'bridge' },
      { source: 'bridge', target: 'x' },
      { source: 'x', target: 'y' },
      { source: 'y', target: 'z' },
    ])
    const bridge = bc.get('bridge') ?? 0
    const aScore = bc.get('a') ?? 0
    const zScore = bc.get('z') ?? 0
    expect(bridge).toBeGreaterThan(aScore)
    expect(bridge).toBeGreaterThan(zScore)
  })
})
