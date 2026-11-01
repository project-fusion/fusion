/**
 * The Checks band, computed when the page builds.
 *
 * Both halves are read from the build, and neither is written by hand. The
 * contrast finding is a theme the engine derived and then measured, and the
 * generator names are the steps of the root `check:gen` script. The card
 * above this band prints the count from the same list, so the two cannot
 * disagree about how many there are.
 */

import type { ThemeEngine, ThemeIntent } from '@fusion.dev/helix-theme'
/* **Imported, so the bundler inlines it.** A `readFileSync` of this file at
   module load worked on the static home page and broke every dynamic route
   under `(site)`: they load this module through the site chrome, and the
   production trace does not carry the repository root's `package.json`. */
import root from '../../../../package.json'

/** The pair the band measures: body text on the page. */
const FOREGROUND = 'color-foreground'
const BACKGROUND = 'color-background'

/**
 * A pinned foreground the engine cannot make readable.
 *
 * **Pinned, because a derived color is solved to the target.** `tokens` is
 * applied after the derivation, so nothing is solved against it and every
 * pairing that names it is measured as it stands. A mid gray is the catch an
 * audit makes: text that looks fine on a bright screen and measures about 3:1
 * on a light page, short of 4.5.
 */
export const CHECKS_INTENT = {
  contrastTarget: 4.5,
  scheme: 'light',
  tokens: { [FOREGROUND]: '#949494' },
} as const satisfies ThemeIntent

/** The engine's finding for the pinned pair, and the colors it measured. */
export interface ContrastCatch {
  background: string
  foreground: string
  ratio: number
  /** The engine's own sentence for the violation. */
  sentence: string
  target: number
}

/**
 * Derives the pinned theme and reads back its failure for the measured pair.
 *
 * Found by the pair's names, never by position: the engine reports every
 * pairing that names the pinned token, and the band is about one of them.
 */
export const contrastCatch = (engine: ThemeEngine): ContrastCatch => {
  const theme = engine.derive(CHECKS_INTENT)
  const pairing = theme.pairings.find(
    (one) => one.foreground === FOREGROUND && one.background === BACKGROUND,
  )
  const sentence = theme.violations.find((line) =>
    line.startsWith(`${FOREGROUND} on ${BACKGROUND}:`),
  )
  const hex = (name: string) => theme.tokens.find((token) => token.name === name)?.hex
  const foreground = hex(FOREGROUND)
  const background = hex(BACKGROUND)
  if (
    pairing?.status !== 'fail' ||
    pairing.ratio === undefined ||
    !sentence ||
    !foreground ||
    !background
  ) {
    throw new Error(`checks: ${FOREGROUND} on ${BACKGROUND} did not fail as the band expects`)
  }
  return { background, foreground, ratio: pairing.ratio, sentence, target: pairing.target }
}

/**
 * A step of `check:gen`, by the short name of what it checks: `turbo run
 * content -- --check` is `content`, and `check:gen:eval` is `eval`.
 */
const step = (part: string): string =>
  part
    .replace(/^bun run /, '')
    .replace(/^turbo run /, '')
    .replace(/ -- --check$/, '')
    .replace(/-check$/, '')
    .replace(/^check:gen:/, '')

/**
 * The steps of the root `check:gen` script, in the order the script runs them.
 *
 * Read from the repository root, because the script belongs to the root and a
 * copy of its names here would be a second list.
 * A nested script is one step: `check:gen:eval` is a name in this list, and
 * what it runs is that script's own concern.
 */
export const GENERATOR_CHECKS: readonly string[] =
  (root.scripts as Record<string, string>)['check:gen']?.split(' && ').map(step) ?? []

if (GENERATOR_CHECKS.length === 0) {
  throw new Error('checks: the root package.json has no check:gen steps to count')
}
