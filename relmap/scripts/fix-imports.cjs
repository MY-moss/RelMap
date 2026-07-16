const fs = require('fs')
const path = require('path')

const IPC_DIR = path.join(__dirname, '..', 'electron', 'ipc')
const MAIN_TS = path.join(__dirname, '..', 'electron', 'main.ts')

// Fix files that use logIpcError but don't import it
function fixImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  if (content.includes('logIpcError(') && !content.includes("import { logger, logIpcError }")) {
    content = content.replace(
      /(import .+ from ['"].+['"];?\n?)/,
      (match) => match + `\nimport { logger, logIpcError } from '../logger'`
    )
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    return true
  }
  return false
}

// Fix files that use logIpcError but import from wrong path
function fixLoggerImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix: import { logger, logIpcError } from '../../../../electron/logger' → '../logger'
  // (this happens for files in src/main/ai/)
  if (content.includes('logIpcError(') && content.includes("from '../../../../electron/logger'")) {
    content = content.replace(
      "from '../../../../electron/logger'",
      "from '../../../electron/logger'"
    )
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    return true
  }
  return false
}

// Fix main.ts logger import
let mainContent = fs.readFileSync(MAIN_TS, 'utf-8')
if (mainContent.includes('logIpcError') && !mainContent.includes("import { logger, logIpcError }")) {
  mainContent = mainContent.replace(
    /import \{ logger \} from '([^']+)'/,
    "import { logger, logIpcError } from '$1'"
  )
  fs.writeFileSync(MAIN_TS, mainContent)
  console.log('Fixed: main.ts')
}

// Fix all IPC files
const ipcFiles = fs.readdirSync(IPC_DIR).filter(f => f.endsWith('.ipc.ts'))
let fixed = 0
for (const file of ipcFiles) {
  if (fixImport(path.join(IPC_DIR, file))) {
    console.log(`Fixed: ipc/${file}`)
    fixed++
  }
}

// Fix src/main/ files
const mainDirs = ['ai', 'db']
for (const dir of mainDirs) {
  const dirPath = path.join(__dirname, '..', 'src', 'main', dir)
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts'))
    for (const file of files) {
      if (fixLoggerImport(path.join(dirPath, file))) {
        console.log(`Fixed: src/main/${dir}/${file}`)
        fixed++
      }
    }
  }
}

// Fix tests that access private methods
const testFile = path.join(__dirname, '..', 'tests', 'unit', 'plugin-system.test.ts')
let testContent = fs.readFileSync(testFile, 'utf-8')
const testOriginal = testContent
testContent = testContent.replace(
  /\.validatePluginName/g,
  '[\'validatePluginName\']'
)
if (testContent !== testOriginal) {
  fs.writeFileSync(testFile, testContent)
  console.log('Fixed: tests/unit/plugin-system.test.ts')
  fixed++
}

console.log(`\nFixed ${fixed} files.`)
