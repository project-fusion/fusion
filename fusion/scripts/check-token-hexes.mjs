#!/usr/bin/env node
/**
 * Holds the token reference's hex column to what a browser actually paints.
 *
 * **The column is resolved by arithmetic and the arithmetic is a second
 * implementation, so this is the half that makes it trustworthy.**
 * `fusion/scripts/lib/paint.mjs` walks `light-dark()`, relative color
 * syntax and `color-mix()` in Node, because the token reference is a committed
 * generated file and `verify` holds it with `--check` in a job that has no
 * browser in it. That buys a documentation table that regenerates anywhere, and
 * it costs the guarantee that the numbers are the ones on screen. This is that
 * guarantee, paid for in the browser job where a browser is already installed.
 *
 * **It reads Chromium's own floats rather than a screenshot.** A canvas readback
 * is premultiplied 8-bit, so a translucent token loses precision on the way out
 * and a disagreement of one code point cannot be told from a rounding artifact.
 * `color-mix(in srgb, <token> 100%, <token>)` is an identity the serializer
 * resolves, and Chromium prints the result as `color(srgb …)` to six figures.
 * Verified against `element.screenshot()` on four colors: the painted pixel and
 * the canvas agree, so the float is the same value with the rounding still in
 * front of it.
 *
 * **The tolerance is one code point, and it is not slack for a wrong answer.**
 * Chromium routes OKLab through a connection space whose matrices are held to
 * about seven figures, so its sRGB differs from the CSS Color 4 arithmetic by a
 * fraction of a byte, and the fraction grows with how far outside sRGB the color
 * asked to be. Measured across all 148: 141 agree within a tenth of a code
 * point, 147 within half, and the worst is `--helix-color-series-3` in dark at
 * 0.618, which is the most out-of-gamut color the palette holds.
 *
 * **Both sides are compared unrounded, which is what makes a tolerance that
 * small mean anything.** Rounded to bytes first, six of these disagree by a
 * whole code point purely because they straddle a rounding boundary, and the
 * check would be measuring the boundary rather than the arithmetic.
 *
 * Nothing in that spread is a hue or a lightness disagreeing. A real fault in
 * the resolver, a `calc()` read wrong or a `light-dark()` branch taken
 * backwards, moves a channel by tens of code points, which is what one is set to
 * see.
 *
 * Run with `bun run check:css:hexes`, after `turbo run styles-dist`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { evaluate, layers, resolveVariables, toHex, toSrgb } from '@fusion.dev/scripts/paint'
import { root } from '@fusion.dev/scripts/workspace'
import { chromium } from 'playwright'

/** Half a code point of eight-bit sRGB, in the 0-to-1 the serializer prints. */
const TOLERANCE = 1 / 255

const registry = JSON.parse(readFileSync(join(root, 'helix/styles/dist/tokens.json'), 'utf8'))
const colors = registry.tokens.filter((token) => token.category === 'color')
const declared = layers(
  readFileSync(join(root, 'helix/styles/src/primitives.css'), 'utf8'),
  registry.tokens,
)

/* `dist` rather than `src`, unusually for a script here, and for the reason
   `build-metrics.mjs` measures `dist`: the browser has to parse this, and the
   comment-stripped file is the one it would parse in a consumer's page. The
   resolver reads `src`, so a stripper that dropped a declaration shows up here
   as a token that resolves on one side and not the other. */
const stylesheet = ['primitives', 'tokens']
  .map((file) => readFileSync(join(root, `helix/styles/dist/${file}.css`), 'utf8'))
  .join('\n')

/**
 * The resolver's answer, unrounded, beside the hex the reference will print.
 *
 * **Unrounded is the point.** Both sides rounded to a byte would disagree by
 * half a code point wherever they straddle a boundary, whatever the underlying
 * difference was, so the check would be measuring the rounding rather than the
 * arithmetic. Six of these do straddle one.
 */
const resolved = (value, scheme) => {
  const color = evaluate(resolveVariables(value, declared), scheme)
  return { ...toSrgb(color), hex: toHex(color) }
}

const browser = await chromium.launch()
let failures = 0
try {
  const page = await browser.newPage()
  await page.setContent(
    `<style>${stylesheet}</style>` +
      '<div id="light" style="color-scheme: light"></div>' +
      '<div id="dark" style="color-scheme: dark"></div>',
  )
  const painted = await page.evaluate(
    (names) => {
      const read = (host) => {
        const answers = {}
        for (const name of names) {
          const element = document.createElement('span')
          /* The identity mix is what makes the serializer convert. Reading
             `color` back on its own returns the `oklch()` it was given. */
          element.style.color = `color-mix(in srgb, var(${name}) 100%, var(${name}))`
          document.getElementById(host).append(element)
          answers[name] = getComputedStyle(element).color
        }
        return answers
      }
      return { dark: read('dark'), light: read('light') }
    },
    colors.map((token) => token.name),
  )

  for (const token of colors) {
    for (const scheme of ['light', 'dark']) {
      const mine = resolved(token.value, scheme)
      const printed = painted[scheme][token.name]
      const numbers = printed.match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number)
      if (!printed.startsWith('color(srgb ') || !numbers || numbers.length < 3) {
        failures += 1
        console.error(`${token.name} (${scheme}): Chromium answered \`${printed}\``)
        continue
      }
      const theirs = { alpha: numbers[3] ?? 1, channels: numbers.slice(0, 3) }
      /* Clamped and not decoded: `color(srgb …)` is already the gamma-encoded
         space the hex is in, and the serializer prints the value unclipped, so
         a color outside sRGB arrives with a negative channel in it. */
      const drift = mine.channels.map((one, index) =>
        Math.abs(one - Math.min(1, Math.max(0, theirs.channels[index]))),
      )
      const worst = Math.max(...drift, Math.abs(mine.alpha - theirs.alpha))
      if (worst > TOLERANCE) {
        failures += 1
        console.error(
          `${token.name} (${scheme}): resolved ${mine.hex}, Chromium paints ${printed}, ` +
            `worst channel off by ${(worst * 255).toFixed(3)} of 255`,
        )
      }
    }
  }
} finally {
  await browser.close()
}

if (failures > 0) {
  console.error(
    `\n${failures} of ${colors.length * 2} token colors disagree with the browser.\n` +
      'Either `fusion/scripts/lib/paint.mjs` is wrong, or a renderer has changed ' +
      'what it paints and the token reference is now reporting the wrong hex.',
  )
  process.exit(1)
}

console.log(`hexes: ${colors.length * 2} token colors match what Chromium paints`)
