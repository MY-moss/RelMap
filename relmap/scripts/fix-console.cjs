/**
 * Batch-replace console.error('[IPC] ...') with logIpcError() calls.
 */
const fs = require('fs')
const path = require('path')

const IPC_DIR = path.join(__dirname, '..', 'electron', 'ipc')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Match: console.error('[IPC] <channel> 错误:', (e as Error).stack || (e as Error).message)
  // Channel can contain alphanum, hyphens, colons, underscores
  content = content.replace(
    /console\.error\('\[IPC\] ([a-zA-Z0-9_:-]+)\s*错误:',\s*\((?:e|error)\s+as\s+Error\)\.stack\s*\|\|\s*\((?:e|error)\s+as\s+Error\)\.message\)/g,
    (match, channel) => `logIpcError('${channel}', e)`
  )

  // Match: console.error('[IPC] <channel>错误:', (e as Error).stack || (e as Error).message) — no space before 错误
  content = content.replace(
    /console\.error\('\[IPC\] ([a-zA-Z0-9_:-]+)错误:',\s*\((?:e|error)\s+as\s+Error\)\.stack\s*\|\|\s*\((?:e|error)\s+as\s+Error\)\.message\)/g,
    (match, channel) => `logIpcError('${channel}', e)`
  )

  // Match: console.error('[IPC] <channel> 错误:', error instanceof Error ? error.stack : error)
  content = content.replace(
    /console\.error\('\[IPC\] ([a-zA-Z0-9_:-]+)\s*错误:',\s*(?:err|error)\s+instanceof\s+Error\s*\?\s*(?:err|error)\.stack\s*:\s*(?:err|error)\)/g,
    (match, channel) => `logIpcError('${channel}', error)`
  )

  // Match: console.error('Failed to close database:', ...)
  content = content.replace(
    /console\.error\('Failed to close database:',\s*\((?:err|e)\s+as\s+Error\)\.message\)/g,
    `logIpcError('db:close', err, 'Failed to close database')`
  )

  if (content !== original) {
    // Update import
    if (content.includes("import { logger } from '../logger'")) {
      content = content.replace(
        "import { logger } from '../logger'",
        "import { logger, logIpcError } from '../logger'"
      )
    }
    // For files that use logger directly (backup.ipc.ts)
    if (content.includes("import { logger } from")) {
      content = content.replace(
        /import \{ logger \} from '([^']+)'/g,
        (match, from) => {
          if (content.includes("logIpcError(")) {
            return `import { logger, logIpcError } from '${from}'`
          }
          return match
        }
      )
    }
    fs.writeFileSync(filePath, content)
    console.log(`Fixed: ${path.basename(filePath)}`)
    return true
  }
  return false
}

const ipcFiles = fs.readdirSync(IPC_DIR).filter(f => f.endsWith('.ipc.ts'))
let fixed = 0
for (const file of ipcFiles) {
  if (fixFile(path.join(IPC_DIR, file))) fixed++
}

// Fix connection.ts
const connPath = path.join(__dirname, '..', 'src', 'main', 'db', 'connection.ts')
let connContent = fs.readFileSync(connPath, 'utf-8')
if (connContent.includes("console.error('Failed to close database:")) {
  connContent = connContent.replace(
    /console\.error\('Failed to close database:',\s*\(err\s+as\s+Error\)\.message\)/,
    "logger.error({ err }, 'Failed to close database')"
  )
  if (connContent.includes("import { logger }")) {
    // already imported
  }
  fs.writeFileSync(connPath, connContent)
  console.log('Fixed: connection.ts')
  fixed++
}

console.log(`\nDone! Fixed ${fixed} files.`)
