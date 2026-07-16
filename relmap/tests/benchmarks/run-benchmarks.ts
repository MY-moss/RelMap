// Benchmark runner
// Usage: npx tsx tests/benchmarks/run-benchmarks.ts

import { performance } from 'node:perf_hooks'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

interface BenchmarkResult {
  name: string
  duration: number
  iterations: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  unit: string
  timestamp: string
}

const RESULTS_DIR = path.join(__dirname, 'results')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations = 5
): Promise<BenchmarkResult> {
  // Warm-up iteration
  await fn()

  const durations: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    durations.push(end - start)
  }

  return {
    name,
    duration: durations.reduce((a, b) => a + b, 0),
    iterations,
    avgDuration: durations.reduce((a, b) => a + b, 0) / iterations,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    unit: 'ms',
    timestamp: new Date().toISOString(),
  }
}

async function main() {
  ensureDir(RESULTS_DIR)
  const results: BenchmarkResult[] = []

  // Use createRequire for modules with Electron dependencies (tsx handles transpilation)
  const duplicateDetect = require('../../src/main/ai/duplicate_detect')
  const textAnalysis = require('../../src/main/ai/text_analysis')

  // Benchmark 1: Levenshtein distance
  console.log('Running Levenshtein benchmark...')
  results.push(await runBenchmark('levenshtein_10chars', () => {
    for (let i = 0; i < 1000; i++) {
      duplicateDetect.levenshteinDistance('kitten', 'sitting')
      duplicateDetect.levenshteinDistance('hello', 'world')
      duplicateDetect.levenshteinDistance('', 'test')
      duplicateDetect.levenshteinDistance('test', '')
    }
  }))

  // Benchmark 2: stringSimilarity
  console.log('Running stringSimilarity benchmark...')
  results.push(await runBenchmark('string_similarity', () => {
    for (let i = 0; i < 1000; i++) {
      duplicateDetect.stringSimilarity('张三', '张四')
      duplicateDetect.stringSimilarity('阿里巴巴集团', '腾讯科技')
      duplicateDetect.stringSimilarity('hello world', 'hello')
    }
  }))

  // Benchmark 3: Text analysis
  console.log('Running text analysis benchmark...')
  results.push(await runBenchmark('extract_keywords', () => {
    for (let i = 0; i < 100; i++) {
      textAnalysis.extractKeywords('今天天气真好，和朋友一起去了公园散步，心情非常愉快。我们一起拍照、聊天、吃东西，度过了美好的一天。', 10)
    }
  }))

  results.push(await runBenchmark('analyze_emotion', () => {
    for (let i = 0; i < 100; i++) {
      textAnalysis.analyzeEmotion('今天非常开心，见到了老朋友，我们一起吃饭聊天，度过了愉快的一天。所有事情都很顺利，我真的很高兴。')
    }
  }))

  // Benchmark 4: JSON operations
  console.log('Running JSON benchmark...')
  const largeData = Array.from({ length: 1000 }, (_, i) => ({
    id: `person-${i}`,
    name: `测试用户${i}`,
    intimacy: Math.floor(Math.random() * 100),
    is_favorite: Math.random() > 0.5 ? 1 : 0,
  }))

  results.push(await runBenchmark('json_stringify_1000', () => {
    JSON.stringify(largeData)
  }))

  results.push(await runBenchmark('json_parse_1000', () => {
    const str = JSON.stringify(largeData)
    JSON.parse(str)
  }))

  // Save results
  const outputPath = path.join(RESULTS_DIR, `benchmark-${Date.now()}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  // Print summary
  console.log('\n=== Benchmark Results ===')
  console.log(`Results saved to: ${outputPath}\n`)

  for (const r of results) {
    const bar = '█'.repeat(Math.round(r.avgDuration))
    console.log(`${r.name.padEnd(30)} ${r.avgDuration.toFixed(2).padStart(8)} ms ${bar}`)
  }

  // Check thresholds
  const failures: string[] = []
  for (const r of results) {
    if (r.avgDuration > 100) {
      failures.push(`${r.name}: ${r.avgDuration.toFixed(2)}ms > 100ms threshold`)
    }
  }

  if (failures.length > 0) {
    console.log('\n\u26a0\ufe0f  Threshold exceeded:')
    failures.forEach(f => console.log(`  - ${f}`))
  } else {
    console.log('\n\u2705 All benchmarks within thresholds')
  }
}

main().catch(console.error)
