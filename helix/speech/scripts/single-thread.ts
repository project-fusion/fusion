/**
 * Places the single-thread Moonshine build in `dist/single-thread`, after
 * checking each file against the digest `single-thread.json` pins. The files
 * come from `vendor/single-thread`, which `build-single-thread.sh` writes.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const pins = JSON.parse(readFileSync(join(root, 'single-thread.json'), 'utf8')) as {
  files: Record<string, string>
}
const from = join(root, 'vendor', 'single-thread')
const to = join(root, 'dist', 'single-thread')
mkdirSync(to, { recursive: true })

for (const [name, digest] of Object.entries(pins.files)) {
  const path = join(from, name)
  if (!existsSync(path)) {
    throw new Error(`${path} is missing. Run scripts/build-single-thread.sh to build it.`)
  }
  const actual = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (actual !== digest) {
    throw new Error(`${path} has digest ${actual}, and single-thread.json pins ${digest}.`)
  }
  copyFileSync(path, join(to, name))
}
