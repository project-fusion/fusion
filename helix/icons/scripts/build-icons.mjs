#!/usr/bin/env node
/**
 * Generates the Helix set, through the generator the package publishes.
 *
 * **The same tool a consumer runs**, called with this set's own sources: the
 * names in `icons.txt`, resolved from `@phosphor-icons/core` at build time, bold
 * weight and then fill, then `raw/` for the marks that are not Phosphor at all.
 * Six megabytes of every icon at every weight sits in `node_modules`; what ships
 * is the handful named here.
 *
 * **Bold rather than regular.** Phosphor's regular is a hairline next to the
 * type it sits beside: at `icon-sm` in a tree row or a listbox option it reads
 * as a lighter gray than the words it belongs to, which is the opposite of what
 * a mark is for. Bold matches the medium weight every row in this library is set
 * in. The four `-fill` names miss in `bold/` and land in `fill/`, which is
 * deliberate: fill is a different statement from weight, and there is no bold of
 * a fill to want.
 *
 * **The index is written for the default weight alone.** It names every glyph,
 * so no bundler can drop any of it, and a copy per weight would charge every
 * subpath for the door only markup uses.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from '../src/build.ts'

// `fileURLToPath`, not `import.meta.dir`: the latter is Bun's and is undefined
// under node, which is what runs the tooling scripts.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PHOSPHOR = join(ROOT, 'node_modules/@phosphor-icons/core/assets')
const RAW = join(ROOT, 'helix/icons/raw')
const LIST = join(ROOT, 'helix/icons/icons.txt')

/**
 * The weights the package publishes, and what each one is for.
 *
 * Two, rather than Phosphor's six. `bold` is the default; `regular` is the one a
 * consumer asks for, being what every other library draws. The rest have no
 * consumer and each costs the published package another fifty kilobytes, so they
 * are a line here on the day one does.
 */
const WEIGHTS = [
  { name: 'bold', suffix: '-bold' },
  { name: 'regular', suffix: '' },
]

const names = readList(LIST)
const [first] = WEIGHTS
for (const { name: weight, suffix } of WEIGHTS) {
  const many = build({
    index: weight === first.name,
    names,
    out:
      weight === first.name
        ? join(ROOT, 'helix/icons/src/generated.ts')
        : join(ROOT, `helix/icons/src/${weight}.generated.ts`),
    sources: [
      { directory: join(PHOSPHOR, weight), suffix },
      { directory: join(PHOSPHOR, 'fill') },
      { directory: RAW },
    ],
    typeImport: './types.js',
  })
  console.log(`icons: ${many} generated at ${weight}`)
}

/** The names this set carries, one per line, `#` for a comment. */
function readList(at) {
  return readFileSync(at, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .sort()
}
