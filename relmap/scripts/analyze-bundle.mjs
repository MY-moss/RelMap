import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const distElectronDir = path.resolve(__dirname, '../dist-electron')

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function analyzeDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`)
    return
  }

  const files = []
  let totalSize = 0

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.css') || entry.name.endsWith('.html') || entry.name.endsWith('.cjs') || entry.name.endsWith('.mjs')) {
        const stat = fs.statSync(fullPath)
        const size = stat.size
        totalSize += size
        files.push({
          name: path.relative(dir, fullPath),
          size,
          formattedSize: formatSize(size),
        })
      }
    }
  }

  walk(dir)

  files.sort((a, b) => b.size - a.size)

  console.log(`\n=== ${path.basename(dir)} Bundle Analysis ===`)
  console.log(`Total files: ${files.length}`)
  console.log(`Total size: ${formatSize(totalSize)}`)
  console.log()

  for (const file of files) {
    const bar = '█'.repeat(Math.round((file.size / Math.max(...files.map(f => f.size))) * 40))
    console.log(`${file.formattedSize.padStart(10)} ${bar} ${file.name}`)
  }

  return { files, totalSize }
}

console.log('=== RelMap Bundle Size Report ===')
console.log(`Date: ${new Date().toISOString()}`)
console.log(`Node: ${process.version}`)

const renderer = analyzeDir(distDir)
const main = analyzeDir(distElectronDir)

if (renderer && main) {
  const total = renderer.totalSize + main.totalSize
  console.log(`\n=== Summary ===`)
  console.log(`Renderer:   ${formatSize(renderer.totalSize)}`)
  console.log(`Main:       ${formatSize(main.totalSize)}`)
  console.log(`Total:      ${formatSize(total)}`)

  const threshold = 5 * 1024 * 1024
  const errorThreshold = 8 * 1024 * 1024
  if (total > errorThreshold) {
    console.log(`❌ FAIL: Bundle size ${formatSize(total)} exceeds error threshold of ${formatSize(errorThreshold)}`)
  } else if (total > threshold) {
    console.log(`⚠️  WARNING: Bundle size ${formatSize(total)} exceeds warning threshold of ${formatSize(threshold)}`)
  } else {
    console.log(`✅ PASS: Bundle size ${formatSize(total)} within threshold of ${formatSize(threshold)}`)
  }
}
