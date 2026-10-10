import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = path.join(root, 'resources/build/icon-square.png')
const output = path.join(root, 'resources/build/icon.ico')

if (!fs.existsSync(input)) {
  console.error('Missing', input)
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['--yes', 'png-to-ico@2.1.8', input],
  { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, shell: true },
)

if (result.status !== 0) {
  console.error(result.stderr?.toString() || 'png-to-ico failed')
  process.exit(result.status || 1)
}

fs.writeFileSync(output, result.stdout)
console.log('Wrote', output, result.stdout.length, 'bytes')
