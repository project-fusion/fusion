/**
 * The browser distribution answers what the engine answers.
 *
 * **The oracle is the reference for both halves, which is what makes this
 * cheap.** `oracle.json` holds sixteen whole themes as the TypeScript derives
 * them, and `cargo test` asserts the crate against it on the host. So what is
 * left to prove here is that nothing is lost crossing the boundary, and that
 * `wasm32` computes what the host computes.
 *
 * **The second half turned out not to be free, and this is where it was found.**
 * A `wasm32` build does not use the host's libm: it takes Rust's own, so `powf`,
 * `cbrt` and `atan2` are allowed to land a last place apart from what macOS
 * answers. Measured across seventeen themes: 103 of 3,249 intermediates differ,
 * worst 1.56e-13 on a hue. Nothing about that is alarming and all of it has to
 * be stated, because "one implementation" now means one algorithm in two float
 * environments rather than one binary, and the figure this prints is what would
 * move if that ever stopped being true.
 *
 * So the artifact is asserted exactly and the intermediates to a tolerance,
 * which is the policy `assert_token` already applies to the same class of
 * difference. **Every emitted hex agrees**, which is the thing that ships: a
 * difference eleven orders below the byte it protects cannot move one.
 *
 * Key *order* is not asserted. An object's key order is not part of a JavaScript
 * interface, and the crate builds its JSON in the order its struct declares
 * rather than the order the TypeScript's literal happens to use.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INTENTS } from './theme-intents.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const WASM = join(ROOT, 'helix/theme/wasm')

/**
 * Eleven orders below the last hex digit it could move, and the same figure the
 * Rust oracle holds its own intermediates to.
 */
const TOLERANCE = 1e-12

if (!existsSync(join(WASM, 'fusion_helix_theme.js'))) {
  /* **Refused rather than built here, and rather than skipped.** This no longer
     runs `bun run gen:wasm` first, which is the point of it: the artifact is tracked
     now, so what gets measured against the oracle is the file that ships rather
     than a fresh one built beside it. Reaching this line means the tracked file
     is gone, which is a deleted artifact rather than a missing toolchain.
     Saying so and failing is the point: a check that quietly passes when it
     cannot run is a green tick with nothing behind it, which is worse than a
     red one. */
  console.error(
    'wasm: helix/theme/wasm is tracked and is not here, so this check has\n' +
      'nothing to measure. Restore it, or rebuild it with `bun run gen:wasm`, which\n' +
      'needs the `wasm32-unknown-unknown` target and the `wasm-bindgen` CLI:\n' +
      '  rustup target add wasm32-unknown-unknown\n' +
      '  cargo install wasm-bindgen-cli --version 0.2.126 --locked',
  )
  process.exit(1)
}

const engine = await import(join(WASM, 'fusion_helix_theme.js'))
/* `--target web` exports an `init` taking a URL or the bytes. Node has no
   `fetch` for a `file:` URL, so the bytes are read rather than pointed at, which
   is also what a bundler ends up doing. */
await engine.default({ module_or_path: readFileSync(join(WASM, 'fusion_helix_theme_bg.wasm')) })

const oracle = JSON.parse(readFileSync(join(ROOT, 'helix/theme/rust/oracle.json'), 'utf8'))
const intents = new Map(INTENTS.map(({ intent, label }) => [label, intent]))

const wrong = []
/** The largest last-place difference seen, so the claim above is a measurement. */
let worst = { apart: 0, at: 'nothing' }
/* **Two counters, because one of them would lie.** The first version counted
   only the values that differed and reported them as "intermediates agree to
   1e-12", which reads as coverage and means the opposite: a port that agreed
   everywhere would have announced that it checked nothing. */
let compared = 0
let differing = 0

const near = (ours, theirs, at) => {
  if (ours === undefined && theirs === undefined) {
    return
  }
  compared += 1
  if (ours === theirs) {
    return
  }
  if (typeof ours !== 'number' || typeof theirs !== 'number') {
    wrong.push(`${at}: ${JSON.stringify(ours)} against ${JSON.stringify(theirs)}`)
    return
  }
  differing += 1
  const apart = Math.abs(ours - theirs)
  if (apart > worst.apart) {
    worst = { apart, at }
  }
  if (apart > TOLERANCE) {
    wrong.push(`${at}: ${ours} against ${theirs}, ${apart.toExponential(2)} apart`)
  }
}

/**
 * **A hue is only meaningful in proportion to its chroma**, so the arc is
 * compared rather than the angle.
 *
 * `#808080` is a pure gray: its chroma is 2.2e-8, so its hue is `atan2` of two
 * values near zero and is not a direction so much as the residue of three cube
 * roots. Measured, the two libms put it 1.43e-7 degrees apart while agreeing on
 * the chroma to 1.11e-16, and at that chroma the whole angle moves the color by
 * about 1e-15 in Oklab. Comparing the angle asks a question the number cannot
 * answer.
 *
 * The arc, `chroma * Δθ` in radians, is how far the point actually traveled,
 * which is the quantity a rendered color is made of. It is also *stricter* than
 * the angle wherever chroma is real: a tenth of a degree at chroma 0.2 is a
 * visible move and would fail here.
 */
const arc = (ours, theirs, chroma, at) => {
  if (ours === undefined && theirs === undefined) {
    return
  }
  compared += 1
  if (ours === theirs) {
    return
  }
  if (typeof ours !== 'number' || typeof theirs !== 'number') {
    wrong.push(`${at}: ${JSON.stringify(ours)} against ${JSON.stringify(theirs)}`)
    return
  }
  differing += 1
  /* Around the short way, so 359.9 against 0.1 is a fifth of a degree rather
     than very nearly the whole circle. */
  const degrees = Math.abs(((ours - theirs + 540) % 360) - 180)
  const apart = Math.abs(chroma) * ((degrees * Math.PI) / 180)
  if (apart > worst.apart) {
    worst = { apart, at }
  }
  if (apart > TOLERANCE) {
    wrong.push(
      `${at}: ${ours} against ${theirs}, ${degrees.toExponential(2)} degrees at chroma ` +
        `${chroma.toExponential(2)}, an arc of ${apart.toExponential(2)}`,
    )
  }
}

const same = (ours, theirs, at) => {
  if (ours !== theirs) {
    wrong.push(`${at}: ${JSON.stringify(ours)} against ${JSON.stringify(theirs)}`)
  }
}

for (const theme of oracle.themes) {
  const intent = intents.get(theme.label)
  if (!intent) {
    wrong.push(`${theme.label}: the oracle holds a theme no intent produces`)
    continue
  }
  const source = JSON.stringify(intent)

  const derived = JSON.parse(engine.derive(source, JSON.stringify([':root'])))

  /* The block is a file a consumer pastes, so it is asserted as bytes. */
  const css = derived.css[':root']
  if (css !== theme.css) {
    const ours = css.split('\n')
    const theirs = theme.css.split('\n')
    const at = ours.findIndex((line, index) => line !== theirs[index])
    wrong.push(
      at === -1
        ? `${theme.label}: emits ${ours.length} lines against ${theirs.length}`
        : `${theme.label}: emits \`${ours[at]}\` where the engine emits \`${theirs[at]}\``,
    )
  }

  same(derived.tokens.length, theme.tokens.length, `${theme.label}: token count`)
  for (const [index, token] of derived.tokens.entries()) {
    const theirs = theme.tokens[index] ?? {}
    const at = `${theme.label}/${theirs.name ?? index}`
    same(token.name, theirs.name, `${at}: name`)
    same(token.hex, theirs.hex, `${at}: hex`)
    same(token.origin, theirs.origin, `${at}: origin`)
    same(token.chromaReduced, theirs.chromaReduced, `${at}: chromaReduced`)
    /* **Absent, not null.** `contrast?: number` drops the key in TypeScript and
       a `None` would write `null`, which reads the same through `?? fallback`
       and differently through `'contrast' in token`, `Object.keys`, and any
       schema that separates optional from nullable. */
    same('contrast' in token, 'contrast' in theirs, `${at}: contrast is present`)
    near(token.contrast, theirs.contrast, `${at}: contrast`)
    for (const part of ['chroma', 'lightness']) {
      near(token.value[part], theirs.value?.[part], `${at}: ${part}`)
    }
    arc(token.value.hue, theirs.value?.hue, token.value.chroma, `${at}: hue`)
  }

  same(derived.pairings.length, theme.pairings.length, `${theme.label}: pairing count`)
  for (const [index, pairing] of derived.pairings.entries()) {
    const theirs = theme.pairings[index] ?? {}
    const at = `${theme.label}/${pairing.foreground} on ${pairing.background}`
    same(pairing.foreground, theirs.foreground, `${at}: foreground`)
    same(pairing.background, theirs.background, `${at}: background`)
    /* Exact, and it is the half a consumer branches on: a ratio a last place
       under its target would report `fail` where the engine reports `pass`, and
       that is a different answer rather than a different number. */
    same(pairing.status, theirs.status, `${at}: status`)
    same(pairing.target, theirs.target, `${at}: target`)
    same('ratio' in pairing, 'ratio' in theirs, `${at}: ratio is present`)
    near(pairing.ratio, theirs.ratio, `${at}: ratio`)
  }

  for (const field of ['collisions', 'seeds', 'violations']) {
    same(JSON.stringify(derived[field]), JSON.stringify(theme[field]), `${theme.label}: ${field}`)
  }
}

/* **The hex reader is checked against the oracle's own parse table**, which is
   the one place the boundary carries a value the theme comparison never touches:
   the site reads a color input with it before an intent exists. Held to the
   same tolerance for the same reason, `cbrt` and `atan2` being where the two
   libms part company. */
{
  const hexes = oracle.hexes ?? []
  for (const entry of hexes) {
    const ours = JSON.parse(engine.hexToOklch(entry.hex))
    for (const part of ['chroma', 'lightness']) {
      near(ours[part], entry[part], `hexToOklch(${entry.hex}): ${part}`)
    }
    arc(ours.hue, entry.hue, ours.chroma, `hexToOklch(${entry.hex}): hue`)
  }
  if (hexes.length === 0) {
    wrong.push('the oracle records no hexes, so the reader is checked against nothing')
  }
}

if (wrong.length > 0) {
  console.error(`wasm: ${wrong.length} disagreements with the oracle:\n  ${wrong.join('\n  ')}`)
  process.exit(1)
}

console.log(
  `wasm: ${oracle.themes.length} themes derive identically through the browser distribution. ` +
    'Every emitted block byte for byte, every hex, origin and status exact. ' +
    `Of ${compared} intermediates, ${differing} differ in the last place, worst ` +
    `${worst.apart.toExponential(2)} at ${worst.at}, against a tolerance of ${TOLERANCE}. ` +
    'Hues are compared as arcs, since an angle at chroma zero is not a direction',
)
