#!/usr/bin/env node
/**
 * Holds GLSL written inside JavaScript template literals to being GLSL.
 *
 * **Written against a failure that happened twice in one afternoon.** A shader
 * is a template literal, and a backtick anywhere inside it, including inside a
 * GLSL comment quoting a CSS property, ends the literal early. What follows is
 * parsed as JavaScript, and the results are not a syntax error at the backtick:
 * once it stripped every brace out of a two hundred line shader, and the
 * compiler reported `'return' : syntax error` on line seventeen. Neither
 * message names the cause, and both arrive at runtime, in a browser, from the
 * GPU driver.
 *
 * There is no linter for this. Biome sees a valid string and Prettier formats
 * it happily; the GLSL is opaque to both. So the check is here.
 *
 * A shader is identified by its own first line rather than by a filename or a
 * tag, which is the one marker that cannot drift: GLSL ES 3.00 requires
 * `#version 300 es` to be the first characters of the source, so a literal that
 * opens with it is a shader by the language's own definition.
 */

import { globSync, readFileSync } from 'node:fs'
import { ROOTS } from './lib/workspace.mjs'

const OPENER = '`#version 300 es'

/* **The roots are named once and this glob spelled them out**, so when `site/`
   became `fusion/site` the pattern went on matching nothing under that name and
   the check went on passing: 1,117 files scanned where 1,343 exist, and it only
   stayed green because both shaders are in `helix/`. A check that silently
   narrows reads exactly like a check that found nothing. */
const FILES = globSync(`{${ROOTS.join(',')}}/**/*.{ts,tsx,mjs,js}`, {
  exclude: (path) => path.includes('node_modules') || path.includes('/dist/'),
})

const problems = []
let found = 0

for (const file of FILES) {
  const source = readFileSync(file, 'utf8')
  let at = source.indexOf(OPENER)

  while (at !== -1) {
    const open = at + 1
    /* The next backtick is where JavaScript ends the literal, whatever the
       author meant. That is the whole point: this reads the string the way the
       parser does, not the way it looks. */
    const close = source.indexOf('`', open)
    const line = source.slice(0, at).split('\n').length
    const literal = close === -1 ? source.slice(open) : source.slice(open, close)

    found++
    const opens = (literal.match(/{/g) ?? []).length
    const closes = (literal.match(/}/g) ?? []).length

    if (close === -1) {
      problems.push(`${file}:${line} shader literal is never closed`)
    } else if (!literal.includes('void main')) {
      problems.push(
        `${file}:${line} shader literal ends before \`void main\`, so a backtick inside it closed the template early`,
      )
    } else if (opens !== closes) {
      problems.push(
        `${file}:${line} shader literal has ${opens} \`{\` against ${closes} \`}\`, so it was cut short or mangled`,
      )
    }

    at = source.indexOf(OPENER, close === -1 ? source.length : close)
  }
}

if (problems.length > 0) {
  console.error(`Shader problems (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('\nA backtick inside a shader ends its template literal. Use no backticks in GLSL.')
  process.exit(1)
}

console.log(
  `shaders: ${found} GLSL literal${found === 1 ? '' : 's'} in ${FILES.length} files, every one closed, complete and balanced`,
)
