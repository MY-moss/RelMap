const fs = require('fs')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  content = content.replace(
    /console\.error\('\[IPC\] ([a-zA-Z0-9_:-]+)\s*错误:',\s*\((?:e|error)\s+as\s+Error\)\.stack\s*\|\|\s*\((?:e|error)\s+as\s+Error\)\.message\)/g,
    (_, channel) => "logIpcError('" + channel + "', e)"
  )

  if (content !== original) {
    if (!content.includes("import { logger, logIpcError }")) {
      content = content.replace(
        /import type \{ Result \} from '\.\.\/\.\.\/src\/shared\/types'/,
        "import type { Result } from '../../src/shared/types'\nimport { logger, logIpcError } from '../logger'"
      )
    }
    fs.writeFileSync(filePath, content)
    console.log('Fixed: ' + filePath.split(/[/\\]/).pop())
  }
}

fixFile('electron/ipc/db-encryption.ipc.ts')
fixFile('electron/ipc/import_export.ipc.ts')
