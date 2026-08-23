#!/usr/bin/env bun
/**
 * Freezes what the TypeScript engine answers, so the Rust port can be held to it.
 *
 * **142 calls the port a move rather than a second implementation, and this is
 * what makes that claim checkable.** `fitToGamut` is a twenty step bisection and
 * `lightnessForContrast` searches too, so iteration count, bisection order and
 * float arithmetic are the answer rather than details of it. Two engines that
 * agree on intent still disagree on output, and a palette is a chain of these:
 * a last-place difference in one channel moves a byte, a byte moves the
 * luminance, and the search that was solving for 4.5 lands on the other side of
 * it. Reading both files cannot find that. Running both can.
 *
 * So the TypeScript is the oracle while the port lands, exactly as that row
 * asks: same inputs to both, the answers asserted identical, and the TypeScript
 * deleted when the crate answers for all of it.
 *
 * **A committed file rather than a harness that runs both.** The alternative
 * shells out to `cargo` from node, or to `bun` from a Rust test, and either way
 * the check needs both toolchains present to say anything. This way `cargo test`
 * is the differential check, on its own, in CI and on a machine with no bun; the
 * only thing that needs both is regenerating, which is what `--check` guards.
 *
 * **The grid is chosen to be hostile rather than representative.** Round numbers
 * agree in any arithmetic. What separates two implementations is the edge: a
 * chroma that puts a channel just past 1.0, a lightness where the bisection's
 * halves straddle the target, a hue on the axis where `atan2` changes sign.
 *
 * Run with `bun run oracle`, or `--check` to fail when it is stale, which is
 * `bun run check:oracle` and part of `bun run verify`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { INTENTS } from './theme-intents.mjs'
import { deriveTheme, perceptualDistance, toCss } from '../../helix/theme/src/derive.ts'
import { STATUS_CHROMA, STATUS_HUE } from '../../helix/theme/src/intent.ts'
import { GROUNDS, INKS } from '../../helix/theme/src/model.ts'
import {
  contrastRatio,
  fitToGamut,
  hexToOklch,
  isOutOfGamut,
  lightnessForContrast,
  oklchToHex,
  relativeLuminance,
  shippedContrastRatio,
  shippedLuminance,
} from '../../helix/theme/src/oklch.ts'

const OUT = 'helix/theme/rust/oracle.json'

/* Hexes a reader could actually pick, plus the shapes that break parsers: the
   three digit form, the extremes, and a grey where chroma is zero and the hue
   `atan2` returns is arbitrary. */
const HEXES = [
  '#000000',
  '#ffffff',
  '#808080',
  '#3b82f6',
  '#f00',
  '#0f0',
  '#00f',
  '#fff',
  '#123456',
  '#fedcba',
  '#ff0080',
  '#00ffcc',
  '#7f7f80',
  '#010203',
  '#fefdfc',
]

/* Lightness and chroma across the whole range including past what sRGB can
   hold, and hues on the axes where a sign flips as well as between them. */
const LIGHTNESS = [0, 0.05, 0.25, 0.5, 0.539, 0.75, 0.95, 1]
const CHROMA = [0, 0.02, 0.1, 0.19, 0.25, 0.4]
const HUE = [0, 45, 90, 135, 180, 225, 258, 270, 315, 359.9]

const colors = []
for (const lightness of LIGHTNESS) {
  for (const chroma of CHROMA) {
    for (const hue of HUE) {
      colors.push({ chroma, hue, lightness })
    }
  }
}

/* The grounds a palette is actually solved against: the page in both modes, a
   raised surface, and a mid brand, which is the case where neither black nor
   white text is obviously right and a luminance heuristic picks wrong. */
const BACKGROUNDS = [
  hexToOklch('#ffffff'),
  hexToOklch('#000000'),
  hexToOklch('#fafafa'),
  hexToOklch('#18181b'),
  hexToOklch('#3b82f6'),
]

const TARGETS = [3, 4.5, 7]

/* The intents the port is derived against.
 *
 * Chosen so each one changes a different phase: the scheme flips the whole
 * ladder, the separation policy scales it, a ceiling of 0 makes every derived
 * colour grey, AAA moves every solved lightness, and a brand that *is* a status
 * colour is the case the hue repair cannot fully answer and reports instead.
 */

const oracle = {
  /* Regenerating is cheap and reviewing a thousand changed floats is not, so the
     header says what to run rather than leaving a reader to guess. */
  '//': 'Generated from helix/theme/src/oklch.ts by `bun run oracle`. Do not edit.',
  colors: colors.map((color) => {
    const fitted = fitToGamut(color)
    return {
      ...color,
      /* The other bisection, dumped directly rather than left to be exercised
         through the search that calls it. */
      fitted: { ...fitted, hex: oklchToHex(fitted) },
      hex: oklchToHex(color),
      luminance: relativeLuminance(color),
      outOfGamut: isOutOfGamut(color),
      shippedLuminance: shippedLuminance(color),
    }
  }),
  /* `perceptualDistance` in the derivation, whose `Math.hypot` of three is not
     the square root of the sum of the squares: measured, a naive port differs on
     37 per cent of inputs. It feeds a threshold the status hue search branches
     on, so a flipped comparison is a different palette rather than a last-place
     difference. */
  distances: colors.slice(0, 80).flatMap((a, at) =>
    colors.slice(at + 1, at + 4).map((b) => {
      /* The lab triples as well as the distance, so a disagreement can be
           localised: `Math.hypot` fed the same three numbers, or `cos` and `sin`
           an ulp out upstream of it. Two very different answers. */
      const toLab = ({ chroma, hue, lightness }) => {
        const rad = (hue * Math.PI) / 180
        return [lightness, chroma * Math.cos(rad), chroma * Math.sin(rad)]
      }
      return { a, b, distance: perceptualDistance(a, b), labA: toLab(a), labB: toLab(b) }
    }),
  ),
  /* The model is data, so it cannot drift by a float. It drifts by a typo in a
     token name, which solves a pair against a ground nobody paints and which no
     compiler on either side would mention. */
  grounds: GROUNDS,
  hexes: HEXES.map((hex) => {
    const color = hexToOklch(hex)
    return { ...color, hex, roundTrip: oklchToHex(color) }
  }),
  inks: INKS,
  pairs: BACKGROUNDS.flatMap((background) =>
    colors.slice(0, 60).map((color) => ({
      background,
      color,
      ratio: contrastRatio(color, background),
      shipped: shippedContrastRatio(color, background),
    })),
  ),
  searches: BACKGROUNDS.flatMap((background) =>
    TARGETS.flatMap((target) =>
      [0, 0.1, 0.2].flatMap((chroma) =>
        [0, 145, 258].flatMap((hue) =>
          [undefined, true, false].map((darker) => {
            const solved = lightnessForContrast({ chroma, hue }, background, target, { darker })
            return {
              background,
              chroma,
              darker: darker ?? null,
              hex: oklchToHex(solved),
              hue,
              lightness: solved.lightness,
              shipped: shippedContrastRatio(solved, background),
              target,
            }
          }),
        ),
      ),
    ),
  ),
  /* Whole derived themes, which is what every phase is ultimately asserted
     against. The artifact is 37 uniquely named tokens, so a disagreement names
     itself rather than needing a search bisected by hand. */
  themes: INTENTS.map(({ intent, label }) => {
    const theme = deriveTheme(intent)
    return {
      collisions: theme.collisions,
      css: toCss(theme),
      label,
      pairings: theme.pairings,
      seeds: theme.seeds,
      tokens: theme.tokens,
      violations: theme.violations,
    }
  }),
}

oracle.statuses = { chroma: STATUS_CHROMA, hue: STATUS_HUE }

const written = `${JSON.stringify(oracle, null, 2)}\n`

if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== written) {
    console.error(
      `${OUT} is behind helix/theme/src/oklch.ts. Run \`bun run oracle\` and commit the result.\n\n` +
        "It is the Rust port's only statement of what the TypeScript answers, so a stale one " +
        'lets `cargo test` certify agreement with an engine that has moved.',
    )
    process.exit(1)
  }
  console.log(
    `oracle: ${oracle.colors.length} colours, ${oracle.hexes.length} hexes, ` +
      `${oracle.searches.length} searches, ${oracle.pairs.length} pairs, current`,
  )
} else {
  writeFileSync(OUT, written)
  console.log(
    `oracle: ${oracle.colors.length} colours, ${oracle.hexes.length} hexes, ` +
      `${oracle.searches.length} searches, ${oracle.pairs.length} pairs written to ${OUT}`,
  )
}
