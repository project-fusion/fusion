#!/usr/bin/env node
/**
 * Holds the theme engine's surface model to what components actually paint.
 *
 * **The guarantee is a claim about the pairs somebody thought of.**
 * `helix/theme/src/model.ts` declares which inks land on which grounds and the
 * engine measures every pair it produces, which is a real guarantee about a
 * list a human wrote. A pair a component paints and the model has never heard
 * of is not failing: it is unmeasured, and nothing anywhere says so.
 *
 * So this reads the stylesheets and reports pairs they paint that the model
 * does not declare.
 *
 * **What it can see, said plainly, because it is a third of the problem.** Only
 * a rule that sets an ink *and* a ground together is legible: measured across
 * `helix/web`, 12 rules do that, while 165 set only an ink and 112 only a
 * ground. The rest inherit their ground from a host, a part above them or the
 * page, and no scan of the text can know which without laying the page out.
 *
 * That is a reason to read this as a floor rather than a census. A pair it
 * finds is real; the pairs it cannot find are why #141 still wants the DOM
 * walker #124 built and never committed, which composites real grounds on a
 * rendered page and answers the other two thirds.
 *
 * **The first run found four the model did not have**, of which the sharpest is
 * `foreground-on-accent` on `foreground-muted`: the time picker fills a range
 * end with the muted grey and puts the on-accent ink on it, deliberately and
 * with the measurement in its comment, and the model had no idea.
 *
 * Run with `bun run check:pairings` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MODEL = 'helix/theme/src/model.ts'
const SOURCE = join(ROOT, 'helix/web/src')

/**
 * Pairs a component paints on purpose that the model deliberately omits, with
 * the reason. An allowlist without reasons becomes the place things go to stop
 * being questioned.
 */
const ACCEPTED = new Map([
  [
    'color-foreground-subtle on color-surface-sunken',
    'the engine does not emit `foreground-subtle` at all: #124 measured that the ' +
      'readable range supports one quiet step and not two, so the stylesheet keeps ' +
      'its own and the engine does not pretend to have solved it',
  ],
])

const uncommented = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ' ')

const sheets = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry !== '.examples') {
        walk(path)
      }
    } else if (entry.endsWith('.css')) {
      sheets.push(path)
    }
  }
}
walk(SOURCE)

/* The model, read as text rather than imported: this is a `.mjs` script and the
   model is TypeScript, and the shape here is simple enough to match. */
const model = uncommented(readFileSync(join(ROOT, MODEL), 'utf8'))
const declared = new Set()
for (const ink of model.matchAll(
  /\{[^{}]*?grounds:\s*\[([^\]]*)\][^{}]*?name:\s*'([a-z0-9-]+)'/gs,
)) {
  const grounds = [...ink[1].matchAll(/'(color-[a-z0-9-]+)'/g)].map((m) => m[1])
  const groups = [...ink[1].matchAll(/\.\.\.(?:\[\.\.\.)?([A-Z_]+)/g)].map((m) => m[1])
  for (const group of groups) {
    const block = model.match(new RegExp(`const ${group} = \\[([^\\]]*)\\]`, 's'))
    if (block) {
      grounds.push(...[...block[1].matchAll(/'(color-[a-z0-9-]+)'/g)].map((m) => m[1]))
    }
  }
  for (const ground of grounds) {
    declared.add(`${ink[2]} on ${ground}`)
  }
}

const problems = []
const painted = new Map()

for (const path of sheets) {
  const source = uncommented(readFileSync(path, 'utf8'))
  for (const rule of source.matchAll(/\{([^{}]*)\}/g)) {
    const ink = /(?<![-\w])color:\s*var\(--helix-(color-[a-z0-9-]+)/.exec(rule[1])
    const ground = /background-color:\s*var\(--helix-(color-[a-z0-9-]+)/.exec(rule[1])
    if (ink && ground) {
      painted.set(`${ink[1]} on ${ground[1]}`, relative(ROOT, path))
    }
  }
}

for (const [pair, path] of [...painted].sort()) {
  if (declared.has(pair) || ACCEPTED.has(pair)) {
    continue
  }
  problems.push(
    `${path} paints \`${pair}\` and ${MODEL} does not declare it, so the engine ` +
      'never measures that pair and a theme reports it neither passing nor ' +
      'failing. Add the ground to that ink, or record it in `ACCEPTED` with the ' +
      "reason it is not the engine's to check.",
  )
}

for (const [pair, why] of ACCEPTED) {
  if (!painted.has(pair)) {
    problems.push(
      `\`${pair}\` is in \`ACCEPTED\` (${why}) and nothing paints it. An ` +
        'exemption for a pair no component makes is an entry nobody will remove.',
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Pairs painted and unmodelled (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `pairings: ${painted.size} pairs painted in one rule, ` +
    `every one of them modelled or accounted for`,
)
