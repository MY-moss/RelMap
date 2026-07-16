import { describe, it, expect } from 'vitest'

interface IntimacyRow {
  person_id: string
  related_person_id: string
  intimacy: number
}

const LOUVAIN_RESOLUTION = 1.0
const LOUVAIN_MAX_ITERATIONS = 100

interface CommunityResult {
  communityMap: Map<string, string[]>
  modularity: number
}

function louvainCommunityDetection(relationshipsRows: IntimacyRow[]): CommunityResult {
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
  const result: CommunityResult = { communityMap: new Map(), modularity: 0 }
  if (nodes.length === 0) return result

  const degree = new Map<string, number>()
  let totalEdgeWeight = 0
  for (const [u, neighbors] of adj) {
    let d = 0
    for (const w of neighbors.values()) d += w
    degree.set(u, d)
    totalEdgeWeight += d
  }
  totalEdgeWeight /= 2
  if (totalEdgeWeight === 0) return result

  const community = new Map<string, string>()
  for (const n of nodes) community.set(n, n)

  const commTot = new Map<string, number>()
  for (const [n, cid] of community) {
    commTot.set(cid, (commTot.get(cid) ?? 0) + (degree.get(n) ?? 0))
  }

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

  const communityMap = new Map<string, string[]>()
  for (const [node, cid] of community) {
    const list = communityMap.get(cid) ?? []
    list.push(node)
    communityMap.set(cid, list)
  }

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

  result.communityMap = communityMap
  result.modularity = modularity
  return result
}

describe('Louvain community detection', () => {
  it('returns empty result for empty relationships', () => {
    const result = louvainCommunityDetection([])
    expect(result.communityMap.size).toBe(0)
    expect(result.modularity).toBe(0)
  })

  it('places two connected nodes in the same community', () => {
    const edges: IntimacyRow[] = [
      { person_id: 'a', related_person_id: 'b', intimacy: 80 },
    ]
    const result = louvainCommunityDetection(edges)
    expect(result.communityMap.size).toBe(1)
    const members = Array.from(result.communityMap.values())[0]
    expect(members).toContain('a')
    expect(members).toContain('b')
  })

  it('separates disconnected groups', () => {
    const edges: IntimacyRow[] = [
      { person_id: 'a', related_person_id: 'b', intimacy: 90 },
      { person_id: 'c', related_person_id: 'd', intimacy: 85 },
    ]
    const result = louvainCommunityDetection(edges)
    expect(result.communityMap.size).toBeGreaterThanOrEqual(2)
  })

  it('assigns a node with strong ties to its community', () => {
    const edges: IntimacyRow[] = [
      { person_id: 'a', related_person_id: 'b', intimacy: 90 },
      { person_id: 'a', related_person_id: 'c', intimacy: 85 },
      { person_id: 'b', related_person_id: 'c', intimacy: 80 },
      { person_id: 'c', related_person_id: 'd', intimacy: 20 },
    ]
    const result = louvainCommunityDetection(edges)
    const communityMap = result.communityMap
    for (const [, members] of communityMap) {
      if (members.length >= 3) {
        expect(members).toContain('a')
        expect(members).toContain('b')
        expect(members).toContain('c')
      }
    }
  })

  it('produces modularity between -1 and 1', () => {
    const edges: IntimacyRow[] = [
      { person_id: 'a', related_person_id: 'b', intimacy: 70 },
      { person_id: 'b', related_person_id: 'c', intimacy: 60 },
      { person_id: 'd', related_person_id: 'e', intimacy: 50 },
    ]
    const result = louvainCommunityDetection(edges)
    expect(result.modularity).toBeGreaterThanOrEqual(-1)
    expect(result.modularity).toBeLessThanOrEqual(1)
  })
})
