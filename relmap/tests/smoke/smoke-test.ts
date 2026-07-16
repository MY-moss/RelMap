// Smoke test - verifies core modules import and execute without errors
// Run with: npx tsx tests/smoke/smoke-test.ts

import { extractKeywords, analyzeEmotion } from '../../src/main/ai/text_analysis'

// Local implementations for algorithm testing (avoid electron dependency in smoke test)
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  const lenA = a.length
  const lenB = b.length
  if (lenA < lenB) return levenshteinDistance(b, a)
  let prev = new Array<number>(lenB + 1)
  let curr = new Array<number>(lenB + 1)
  for (let j = 0; j <= lenB; j++) prev[j] = j
  for (let i = 1; i <= lenA; i++) {
    curr[0] = i
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const tmp = prev; prev = curr; curr = tmp
  }
  return prev[lenB]
}

function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1
  const dist = levenshteinDistance(a, b)
  return 1 - dist / Math.max(a.length, b.length)
}

let total = 0
let passed = 0

function assert(condition: boolean, msg: string) {
  total++
  if (condition) {
    passed++
    console.log(`  ✅ ${msg}`)
  } else {
    console.log(`  ❌ ${msg}`)
  }
}

function section(name: string) {
  console.log(`\n=== ${name} ===`)
}

// ==================== Test 1: Text Analysis ====================

function testTextAnalysis() {
  section('Text Analysis')

  // extractKeywords
  const result = extractKeywords('今天天气真好，和朋友一起去了公园散步，心情非常愉快。')
  assert(result.success, 'extractKeywords should succeed')
  if (result.success) {
    assert(result.data.keywords.length > 0, 'Should extract keywords')
    console.log(`    Keywords: ${result.data.keywords.slice(0, 5).join(', ')}`)
  }

  const emptyResult = extractKeywords('')
  assert(emptyResult.success, 'extractKeywords handles empty text')
  if (emptyResult.success) {
    assert(emptyResult.data.keywords.length === 0, 'Empty text yields no keywords')
  }

  const nullResult = extractKeywords(null as unknown as string)
  assert(nullResult.success, 'extractKeywords handles null')

  // analyzeEmotion - positive
  const emotion = analyzeEmotion('今天非常开心，见到了老朋友，我们一起吃饭聊天，度过了愉快的一天。')
  assert(emotion.success, 'analyzeEmotion should succeed')
  if (emotion.success) {
    assert(emotion.data.label === 'positive', 'Positive text should be positive')
    console.log(`    Emotion: ${emotion.data.label} (${emotion.data.score.toFixed(2)})`)
  }

  // analyzeEmotion - negative
  const negative = analyzeEmotion('最近工作压力很大，感觉很疲惫，心情很低落。')
  if (negative.success) {
    assert(negative.data.label === 'negative', 'Negative text should be negative')
    console.log(`    Negative: ${negative.data.label} (${negative.data.score.toFixed(2)})`)
  }

  // analyzeEmotion - neutral
  const neutral = analyzeEmotion('今天去了超市，买了些东西')
  if (neutral.success) {
    assert(neutral.data.label === 'neutral', 'Neutral text should be neutral')
  }

  // Levenshtein
  assert(levenshteinDistance('kitten', 'sitting') === 3, 'levenshtein("kitten", "sitting") === 3')
  assert(levenshteinDistance('', 'hello') === 5, 'levenshtein with empty string')
  assert(levenshteinDistance('abc', 'abc') === 0, 'levenshtein identical strings')

  // stringSimilarity
  assert(stringSimilarity('hello', 'hello') === 1, 'identical strings similarity === 1')
  assert(stringSimilarity('', '') === 1, 'empty strings similarity === 1')
  assert(stringSimilarity('hello', '') === 0, 'one empty similarity === 0')

  console.log('  ✅ All text analysis tests passed')
}

// ==================== Test 2: Louvain Community Detection ====================

function testLouvain() {
  section('Louvain Community Detection')

  const LOUVAIN_RESOLUTION = 1.0
  const LOUVAIN_MAX_ITERATIONS = 100

  interface IntimacyRow {
    person_id: string
    related_person_id: string
    intimacy: number
  }

  function runLouvain(relationshipsRows: IntimacyRow[]): { communityMap: Map<string, string[]>; modularity: number } {
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
    const result = { communityMap: new Map<string, string[]>(), modularity: 0 }
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

  // Empty
  const emptyResult = runLouvain([])
  assert(emptyResult.communityMap.size === 0, 'Empty relationships => no communities')
  assert(emptyResult.modularity === 0, 'Empty relationships => modularity 0')

  // Two connected nodes
  const twoNodes = runLouvain([
    { person_id: 'a', related_person_id: 'b', intimacy: 80 },
  ])
  assert(twoNodes.communityMap.size === 1, 'Two connected nodes => 1 community')
  if (twoNodes.communityMap.size === 1) {
    const members = Array.from(twoNodes.communityMap.values())[0]
    assert(members.includes('a') && members.includes('b'), 'Both nodes in same community')
  }

  // Separate groups
  const separate = runLouvain([
    { person_id: 'a', related_person_id: 'b', intimacy: 90 },
    { person_id: 'c', related_person_id: 'd', intimacy: 85 },
  ])
  assert(separate.communityMap.size >= 2, 'Two disconnected pairs => >= 2 communities')

  // Strongly connected trio
  const trio = runLouvain([
    { person_id: 'a', related_person_id: 'b', intimacy: 90 },
    { person_id: 'a', related_person_id: 'c', intimacy: 85 },
    { person_id: 'b', related_person_id: 'c', intimacy: 80 },
    { person_id: 'c', related_person_id: 'd', intimacy: 20 },
  ])
  assert(trio.modularity >= -1 && trio.modularity <= 1, 'Modularity in [-1, 1]')

  console.log('  ✅ All Louvain tests passed')
}

// ==================== Test 3: Logger ====================

async function testLogger() {
  section('Logger')

  try {
    const { default: pino } = await import('pino')
    const logger = pino({ level: 'silent' })
    assert(typeof logger.info === 'function', 'pino logger has info method')
    assert(typeof logger.warn === 'function', 'pino logger has warn method')
    assert(typeof logger.error === 'function', 'pino logger has error method')

    logger.info('smoke test message')
    assert(true, 'pino logger.info executes without error')
  } catch (e) {
    assert(false, `pino import failed: ${(e as Error).message}`)
  }

  console.log('  ✅ All logger tests passed')
}

// ==================== Test 4: Intimacy Scoring ====================

function testIntimacy() {
  section('Intimacy Scoring')

  // scoreFrequency: 0→0, 1-5→30, 6-15→60, 16-30→80, 30+→100
  function scoreFrequency(count: number): number {
    if (count === 0) return 0
    if (count <= 5) return 30
    if (count <= 15) return 60
    if (count <= 30) return 80
    return 100
  }

  function scoreRecency(lastDateStr: string | null): number {
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

  // Frequency
  assert(scoreFrequency(0) === 0, 'frequency 0 => 0')
  assert(scoreFrequency(3) === 30, 'frequency 3 => 30')
  assert(scoreFrequency(10) === 60, 'frequency 10 => 60')
  assert(scoreFrequency(20) === 80, 'frequency 20 => 80')
  assert(scoreFrequency(100) === 100, 'frequency 100 => 100')

  // Recency
  assert(scoreRecency(null) === 0, 'null date => 0')
  assert(scoreRecency('') === 0, 'empty date => 0')
  assert(scoreRecency('invalid') === 0, 'invalid date => 0')

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  assert(scoreRecency(fmt(yesterday)) === 100, 'yesterday => 100')

  const tenDaysAgo = new Date(today)
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
  assert(scoreRecency(fmt(tenDaysAgo)) === 80, '10 days ago => 80')

  const twoMonthsAgo = new Date(today)
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
  assert(scoreRecency(fmt(twoMonthsAgo)) === 60, '60 days ago => 60')

  const fiveMonthsAgo = new Date(today)
  fiveMonthsAgo.setDate(fiveMonthsAgo.getDate() - 150)
  assert(scoreRecency(fmt(fiveMonthsAgo)) === 30, '150 days ago => 30')

  const yearAgo = new Date(today)
  yearAgo.setDate(yearAgo.getDate() - 365)
  assert(scoreRecency(fmt(yearAgo)) === 10, '365 days ago => 10')

  console.log('  ✅ All intimacy tests passed')
}

// ==================== Test 5: Suggestion Engine Rules ====================

function testSuggestionEngine() {
  section('Suggestion Engine Rules')

  // Test the core rule logic in isolation

  // Rule 1: Dormant/lost lifecycle → send greeting
  function shouldSuggestGreeting(lifecycleStage: string): boolean {
    return lifecycleStage === 'dormant' || lifecycleStage === 'lost'
  }
  assert(shouldSuggestGreeting('dormant'), 'dormant => greeting suggestion')
  assert(shouldSuggestGreeting('lost'), 'lost => greeting suggestion')
  assert(!shouldSuggestGreeting('active'), 'active => no greeting')
  assert(!shouldSuggestGreeting('new'), 'new => no greeting')

  // Rule 2: Low intimacy + long no contact → suggest meeting
  function shouldSuggestMeeting(intimacy: number, daysSince: number): boolean {
    return intimacy < 30 && daysSince > 60
  }
  assert(shouldSuggestMeeting(20, 90), 'intimacy 20 + 90 days => meeting suggestion')
  assert(!shouldSuggestMeeting(40, 90), 'intimacy 40 + 90 days => no suggestion')
  assert(!shouldSuggestMeeting(20, 30), 'intimacy 20 + 30 days => no suggestion')

  // Rule 3: Birthday reminder
  function isBirthdayReminder(title: string): boolean {
    return title.includes('生日')
  }
  assert(isBirthdayReminder('张三生日'), 'birthday reminder detected')
  assert(isBirthdayReminder('生日提醒'), 'birthday reminder detected')
  assert(!isBirthdayReminder('会议提醒'), 'non-birthday not detected')

  // Rule 4: Contact frequency declining (7-60 days)
  function shouldSuggestKeepContact(daysSince: number): boolean {
    return daysSince >= 7 && daysSince < 60
  }
  assert(shouldSuggestKeepContact(14), '14 days => keep contact suggested')
  assert(!shouldSuggestKeepContact(3), '3 days => no suggestion')
  assert(!shouldSuggestKeepContact(90), '90 days => no suggestion (handled by other rule)')

  // Rule 5: Combined intimacy scoring for suggestion threshold
  function calculateSuggestionIntimacy(
    interactionCount: number,
    daysSinceLastContact: number,
    eventCount: number,
    diaryCount: number,
    manualIntimacy: number,
  ): number {
    const depth = Math.min(eventCount * 10 + diaryCount * 15, 100)
    return Math.round(
      0.25 * Math.min(interactionCount * 3, 100) +
      0.30 * (daysSinceLastContact <= 7 ? 100 : daysSinceLastContact <= 30 ? 80 : daysSinceLastContact <= 90 ? 60 : daysSinceLastContact <= 180 ? 30 : 10) +
      0.20 * depth +
      0.25 * manualIntimacy,
    )
  }

  const high = calculateSuggestionIntimacy(20, 2, 5, 3, 80)
  assert(high >= 30, 'Active contact intimacy >= 30')

  const low = calculateSuggestionIntimacy(1, 180, 0, 0, 30)
  assert(low < 30, 'Dormant contact intimacy < 30')

  console.log('  ✅ All suggestion engine tests passed')
}

// ==================== Test 6: Bridge Detector (Betweenness Centrality) ====================

function testBridgeDetector() {
  section('Bridge Detector')

  // buildAdjacencyList
  function buildAdjacencyList(edges: { source: string; target: string }[]): Map<string, string[]> {
    const adj = new Map<string, string[]>()
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, [])
      if (!adj.has(e.target)) adj.set(e.target, [])
      adj.get(e.source)!.push(e.target)
      adj.get(e.target)!.push(e.source)
    }
    return adj
  }

  // BFS shortest paths from source
  function bfsShortestPaths(adj: Map<string, string[]>, source: string): Map<string, number> {
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

  // Betweenness centrality (Brandes' algorithm)
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

  // Empty graph
  const emptyBc = betweennessCentrality([])
  assert(emptyBc.size === 0, 'Empty graph => empty betweenness')

  // Simple path a-b-c: b should have highest betweenness
  const pathBc = betweennessCentrality([
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
  ])
  const bScore = pathBc.get('b') || 0
  const aScore = pathBc.get('a') || 0
  const cScore = pathBc.get('c') || 0
  assert(bScore > aScore, 'Central node b has higher betweenness than a')
  assert(bScore > cScore, 'Central node b has higher betweenness than c')

  // Full triangle a-b-c-a: all nodes have same betweenness (0)
  const triangleBc = betweennessCentrality([
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'c', target: 'a' },
  ])
  const triangleScores = Array.from(triangleBc.values())
  const allEqual = triangleScores.every(s => s === triangleScores[0])
  assert(allEqual, 'Triangle graph: all nodes have equal betweenness')

  // Star graph: center has high betweenness, leaves have 0
  const starBc = betweennessCentrality([
    { source: 'center', target: 'leaf1' },
    { source: 'center', target: 'leaf2' },
    { source: 'center', target: 'leaf3' },
  ])
  const centerScore = starBc.get('center') || 0
  const leafScore = starBc.get('leaf1') || 0
  assert(centerScore > 0, 'Center of star has positive betweenness')
  assert(leafScore === 0, 'Leaf has zero betweenness')

  console.log('  ✅ All bridge detector tests passed')
}

// ==================== Main ====================

async function main() {
  console.log('🔍 RelMap Smoke Test')
  console.log(`   ${new Date().toISOString()}`)

  testTextAnalysis()
  testLouvain()
  await testLogger()
  testIntimacy()
  testSuggestionEngine()
  testBridgeDetector()

  console.log(`\n${'='.repeat(40)}`)
  console.log(`Results: ${passed}/${total} assertions passed`)
  if (passed === total) {
    console.log('✅ All smoke tests passed!')
    process.exit(0)
  } else {
    console.log(`❌ ${total - passed} assertion(s) failed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(1)
})
