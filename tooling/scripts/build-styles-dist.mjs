#!/usr/bin/env node
/**
 * Writes what `@helix-io/styles` ships, which is the source without the prose.
 *
 * **The package exported `./src/*.css` and every consumer downloaded the
 * reasoning.** Measured across the four files plus the two `helix/styled`
 * ships: 193,009 bytes raw and 60,944 gzipped, of which 53,445 and 8,219 are
 * declarations. `tokens.css` is 71 percent comment, `primitives.css` 82,
 * `base.css` 75. The prose is the best thing about these files and it is not
 * something a browser should be asked to parse on every cold load.
 *
 * **Comments only, because that is where all of it is.** Squeezing whitespace
 * on top of this saves a further 4,395 bytes raw and 354 gzipped, which is four
 * percent of what is left and does not pay for a minifier dependency or for a
 * transform that could change a value. `postcss` is in the tree only because
 * Next.js brought it, so reaching for it here would be depending on somebody
 * else's dependency.
 *
 * **`src` stays the readable original and nothing else moves.** The tooling
 * that reads these files, eleven scripts across tokens, seeds, motion and
 * overrule checks, keeps reading `src`, because what it checks is what somebody
 * wrote. Only `exports` moves, so a consumer writing
 * `@helix-io/styles/tokens.css` is unaffected and gets the smaller file.
 *
 * **The relative `@import`s in `all.css` survive because the whole set lands
 * side by side.** `dist/all.css` importing `./tokens.css` finds `dist/tokens.css`.
 *
 * Run with `bun run styles:dist`, which `@helix-io/styles`' `build` calls.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/* Resolved from this file rather than from the working directory, because
   turbo runs a package's `build` with the package as its cwd and a contributor
   runs `bun run styles:dist` from the root. */
const ROOT = join(import.meta.dirname, '../..')
const SOURCE = join(ROOT, 'helix/styles/src')
const OUT = join(ROOT, 'helix/styles/dist')

/**
 * Removes CSS comments, and does not remove things that look like them.
 *
 * **A scanner rather than a regex, because a regex is safe against today's
 * content rather than by construction.** A comment opener inside a string or a
 * `url()` is legal CSS, and a closer inside one would end a comment that never
 * started.
 * Nothing in these files does that now, which is exactly the sort of fact that
 * stops being true without anyone noticing, so the string state is tracked.
 *
 * The check below is the other half: strip and then confirm every declaration
 * survived, so a mistake here fails the build rather than shipping a stylesheet
 * with a rule missing from the middle of it.
 */
const withoutComments = (css) => {
  let out = ''
  let quote = ''
  for (let at = 0; at < css.length; at += 1) {
    const char = css[at]
    if (quote) {
      out += char
      if (char === '\\') {
        out += css[at + 1] ?? ''
        at += 1
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      out += char
      continue
    }
    if (char === '/' && css[at + 1] === '*') {
      const end = css.indexOf('*/', at + 2)
      at = end === -1 ? css.length : end + 1
      continue
    }
    out += char
  }
  return out
}

/**
 * Every declaration in a sheet, in order, as `property:value`.
 *
 * **It does not remove comments, and that is the entire point.** The first
 * version ran the scanner above over both sides before comparing, so it
 * compared the stripper's output to itself and passed on anything, verified by
 * breaking the scanner on purpose and watching the build stay green while it
 * dropped 293 bytes of real CSS. A check that shares an implementation with the
 * thing it checks is a check that agrees with itself.
 *
 * So the two sides are reached by two implementations. The source is cleared
 * with a regex, which is simple and correct for anything without a comment
 * marker inside a string; the shipped file is read as it is, having no comments
 * left in it at all. They agree, or one of the two is wrong and a human should
 * look at which.
 */
const declarationsOf = (css) =>
  [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)[;}]/g)].map(
    ([, name, value]) => `${name}:${value.replace(/\s+/g, ' ').trim()}`,
  )

/** The independent second opinion. See `declarationsOf`. */
const withoutCommentsByRegex = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ')

mkdirSync(OUT, { recursive: true })

let raw = 0
let shipped = 0
const written = []

for (const name of readdirSync(SOURCE)
  .filter((one) => one.endsWith('.css'))
  .sort()) {
  const source = readFileSync(join(SOURCE, name), 'utf8')
  const stripped = withoutComments(source)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  /* Same declarations, same order, or something in the scanner is wrong and the
     sheet that ships is not the sheet that was written. */
  const before = declarationsOf(withoutCommentsByRegex(source))
  const after = declarationsOf(stripped)
  if (before.length !== after.length || before.some((one, at) => one !== after[at])) {
    const at = before.findIndex((one, index) => one !== after[index])
    console.error(
      `${name}: stripping changed the declarations. ${before.length} before, ${after.length} after` +
        (at === -1
          ? '.'
          : `, first difference at ${at}: \`${before[at]}\` became \`${after[at]}\`.`),
    )
    process.exit(1)
  }

  if (stripped.includes('/*') || stripped.includes('*/')) {
    console.error(`${name}: a comment marker survived the strip, so the scanner stopped early.`)
    process.exit(1)
  }

  const body = `/* ${name} from @helix-io/styles. The source, with the reasoning in it, is in the repository. */\n${stripped}\n`
  writeFileSync(join(OUT, name), body)
  raw += source.length
  shipped += body.length
  written.push(name)
}

console.log(
  `styles dist: ${written.length} sheets, ${raw.toLocaleString()} bytes of source to ` +
    `${shipped.toLocaleString()} shipped (${Math.round((1 - shipped / raw) * 100)}% smaller)`,
)
