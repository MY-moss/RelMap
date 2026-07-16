const fs = require('fs')

const files = [
  'electron/ipc/db-encryption.ipc.ts',
  'electron/ipc/import_export.ipc.ts',
  'electron/ipc/diary_analysis.ipc.ts',
]

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  const original = content

  // Add logIpcError import if used
  if (content.includes('logIpcError(') && !content.includes("import { logIpcError }")) {
    content = content.replace(
      "import type { Result } from '../../src/shared/types'",
      "import type { Result } from '../../src/shared/types'\nimport { logIpcError } from '../logger'"
    )
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8')
    console.log('Fixed: ' + file)
  }
}
