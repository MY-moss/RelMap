import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function run(cmd) {
  console.log(`> ${cmd}`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
  } catch (e) {
    console.error(`Command failed: ${cmd}`)
    process.exit(1)
  }
}

function resolveVersion(input) {
  const semverKeywords = { major: 0, minor: 1, patch: 2 }
  if (input in semverKeywords || /^\d+\.\d+\.\d+$/.test(input)) {
    return input
  }
  return null
}

function main() {
  const args = process.argv.slice(2)
  const rawVersion = args[0]

  if (!rawVersion) {
    console.error('Usage: node scripts/release.mjs <version|patch|minor|major>')
    console.error('Example: node scripts/release.mjs 2.0.0')
    console.error('         npm run release:patch')
    process.exit(1)
  }

  const pkgPath = path.resolve(__dirname, '../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const currentVersion = pkg.version

  let version = rawVersion
  if (/^(major|minor|patch)$/.test(rawVersion)) {
    const parts = currentVersion.split('.').map(Number)
    const idx = { major: 0, minor: 1, patch: 2 }[rawVersion]
    parts[idx]++
    for (let i = idx + 1; i < 3; i++) parts[i] = 0
    version = parts.join('.')
    console.log(`  ${rawVersion} bump: ${currentVersion} -> ${version}`)
  }

  console.log(`=== RelMap Release Script ===`)
  console.log(`Current version: ${currentVersion}`)
  console.log(`Target version:  ${version}`)
  console.log()

  console.log('Step 1: Updating version...')
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  Updated to ${version}`)

  console.log('Step 2: Running lint...')
  run('npm run lint')

  console.log('Step 3: Running tests...')
  run('npm test')

  console.log('Step 4: Building...')
  run('npx tsc --noEmit')
  run('npx vite build')

  console.log('Step 5: Analyzing bundle...')
  run('node scripts/analyze-bundle.mjs')

  console.log('Step 6: Creating git tag...')
  run(`git add package.json`)
  run(`git commit -m "chore: bump version to ${version}"`)
  run(`git tag v${version}`)

  console.log(`\n=== Release v${version} ready! ===`)
  console.log(`Run 'git push --tags' to publish.`)
  console.log(`Run 'npm run build' to create the installer.`)
}

main()
