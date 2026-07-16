// Compare latest benchmark with baseline
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RESULTS_DIR = path.join(__dirname, 'results')

function getLatestResult(): string | null {
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length > 0 ? files[0] : null
}

function getPreviousResult(currentFile: string): string | null {
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
    .sort()
    .reverse()
  const idx = files.indexOf(currentFile)
  return idx >= 0 && idx < files.length - 1 ? files[idx + 1] : null
}

function compare() {
  const latest = getLatestResult()
  if (!latest) {
    console.log('No benchmark results found.')
    return
  }

  const latestData = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, latest), 'utf-8'))
  console.log(`Latest benchmark: ${latest}`)

  const previous = getPreviousResult(latest)
  if (previous) {
    const prevData = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, previous), 'utf-8'))
    console.log(`Comparing with: ${previous}\n`)

    for (const current of latestData) {
      const prev = (prevData as { name: string; avgDuration: number }[]).find((p) => p.name === current.name)
      if (prev) {
        const diff = current.avgDuration - prev.avgDuration
        const pct = ((diff / prev.avgDuration) * 100).toFixed(1)
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
        console.log(`${current.name.padEnd(30)} ${current.avgDuration.toFixed(2).padStart(8)} ms  ${arrow} ${pct}%`)
      } else {
        console.log(`${current.name.padEnd(30)} ${current.avgDuration.toFixed(2).padStart(8)} ms  (new)`)
      }
    }
  } else {
    console.log('No previous baseline for comparison.')
    for (const r of latestData) {
      console.log(`${r.name.padEnd(30)} ${r.avgDuration.toFixed(2).padStart(8)} ms`)
    }
  }
}

compare()
