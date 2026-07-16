#!/usr/bin/env node
/**
 * RelMap Plugin Scaffold Generator
 * Usage: node scripts/create-plugin.js <plugin-name>
 *
 * Creates a new plugin directory under plugins/ with:
 *   - plugin.json (manifest)
 *   - index.js (sandbox entry point)
 */

const fs = require('fs')
const path = require('path')

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')

const PLUGIN_JSON_TPL = (name) => JSON.stringify({
  name,
  version: '1.0.0',
  description: 'RelMap 插件 — 请修改此描述',
  author: 'RelMap 开发者',
  main: 'index.js',
  hooks: [],
  permissions: [],
  actions: [],
  ui: { slots: [] },
}, null, 2)

const INDEX_JS_TPL = `// ${name} Plugin for RelMap
// Runs inside a sandboxed worker_threads + vm.createContext environment

module.exports = function (api) {
  // Register IPC handlers
  // api.registerIPC('myAction', async (param) => { ... })

  // Register event hooks (must match plugin.json hooks)
  // api.on('app:ready', () => { api.logger.info('Plugin ready') })

  api.logger.info('${name} plugin loaded')
}
`

const name = process.argv[2]
if (!name) {
  console.error('Usage: node scripts/create-plugin.js <plugin-name>')
  console.error('  <plugin-name> must be alphanumeric, dots, hyphens, or underscores (1-100 chars)')
  process.exit(1)
}

if (!/^[a-zA-Z0-9_.-]+$/.test(name) || name.length < 1 || name.length > 100) {
  console.error('Error: Invalid plugin name')
  process.exit(1)
}

const targetDir = path.join(PLUGINS_DIR, name)
if (fs.existsSync(targetDir)) {
  console.error(`Error: Plugin directory already exists: ${targetDir}`)
  process.exit(1)
}

fs.mkdirSync(targetDir, { recursive: true })
fs.writeFileSync(path.join(targetDir, 'plugin.json'), PLUGIN_JSON_TPL(name))
fs.writeFileSync(path.join(targetDir, 'index.js'), INDEX_JS_TPL)

console.log(`Created plugin: ${name}`)
console.log(`  Location: ${targetDir}`)
console.log('')
console.log('Next steps:')
console.log(`  1. Edit plugins/${name}/plugin.json to configure permissions, hooks, UI slots`)
console.log(`  2. Edit plugins/${name}/index.js to implement your plugin logic`)
console.log(`  3. In RelMap, go to Settings > 插件管理 and click 安装插件`)
