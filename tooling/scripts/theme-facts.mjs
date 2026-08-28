/**
 * What the theme engine says about itself, read from the oracle.
 *
 * **The engine is Rust now, and three checks used to read its TypeScript with a
 * regular expression.** That worked while the source was JavaScript and it was
 * never what those checks wanted: each of them is about what the engine *emits*,
 * and each was approximating that from what its templates look like.
 *
 * `oracle.json` is the emitted answer for seventeen intents, and `cargo test`
 * asserts the engine against it, so it cannot go stale without the Rust suite
 * failing. That makes it a better source than the source was: `check:css:seeds` used
 * to match `` `--${namespace}-${family}-${` `` and could see a family but never a
 * leaf, and here the leaves are literally present.
 *
 * **The one thing lost is a name no theme exercises.** Reading templates saw
 * every branch whether or not anything ran it; reading output sees the branches
 * the oracle's intents reach. That is why four of those intents exist purely to
 * turn on the tail of `to_css`, and why adding a branch means adding an intent
 * that reaches it. The trade is worth taking: a template fragment that no theme
 * can produce is a name nothing sets, which is the failure these checks are for.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INTENTS } from './theme-intents.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Where the answers live, named once so a message can point at it. */
export const ORACLE = 'helix/theme/rust/oracle.json'

const themes = JSON.parse(readFileSync(join(ROOT, ORACLE), 'utf8')).themes

/**
 * The default derivation, which is the one that carries the model unmodified.
 *
 * Every other intent changes something, and the pairs are a fact about the
 * surface model rather than about any theme, so they are read from the theme
 * that asked for nothing.
 */
const base = themes.find((theme) => theme.label === 'default')
if (!base) {
  throw new Error(`${ORACLE} holds no \`default\` theme, so the model cannot be read from it`)
}

/**
 * Names a consumer pinned, which are emitted and are not the engine's.
 *
 * The `pinned` intent adds `color-house-teal`, which is the whole point of that
 * feature: a caller may name a token of their own and have it verified beside
 * the rest. Left in the emitted set it reads as a name the engine invented, and
 * `check:css:seeds` would go looking for it in `tokens.css` and ask for a
 * declaration nobody should write.
 */
const pinned = new Set(INTENTS.flatMap(({ intent }) => Object.keys(intent.tokens ?? {})))

/** Every `<ink> on <ground>` the model declares, whatever the pair measured. */
export const pairs = new Set(
  base.pairings.map((pairing) => `${pairing.foreground} on ${pairing.background}`),
)

/**
 * Every color name the model knows, as an ink or as a ground.
 *
 * Taken from the pairs rather than from a token list, deliberately: a ground the
 * model names and no theme emits still has to be declared by the stylesheet, and
 * it appears here as the background of an unverifiable pair.
 */
export const modelNames = new Set(
  base.pairings.flatMap((pairing) => [pairing.foreground, pairing.background]),
)

/** The seeds the engine writes. */
export const seedNames = new Set(Object.keys(base.seeds).map((name) => name.slice('seed-'.length)))

/**
 * Every custom property the engine emits, across every intent, without its
 * namespace.
 *
 * All the themes rather than the default one, because most of the emitted block
 * is conditional: a theme that says nothing about motion emits no duration, and
 * the names still have to exist for the theme that does.
 */
export const emitted = new Set(
  themes
    .flatMap((theme) => [...theme.css.matchAll(/^\s*--[a-z0-9]+-([a-z0-9-]+)\s*:/gm)])
    .map((found) => found[1])
    .filter((name) => !pinned.has(name)),
)
