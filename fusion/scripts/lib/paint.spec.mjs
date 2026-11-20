/**
 * Holds the native token modules to `paint.mjs`, color for color, in both modes.
 *
 * **Two implementations of one arithmetic, held to the byte.** `helix system
 * tokens` evaluates each color with the port in `helix/theme/rust/tokens` and
 * writes its hex into `helix/native/src/theme`, and
 * `check-token-hexes.mjs` holds this file to what Chromium paints, so a color
 * native draws is the color a browser paints. `helix system tokens --check`
 * holds the modules to the token layer, which is what makes reading them here
 * a reading of the port.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { layers, paint } from './paint.mjs'
import { root } from './workspace.mjs'

const theme = join(root, 'helix/native/src/theme')
const { TOKENS } = await import(join(root, 'helix/styles/src/tokens.ts'))
const declared = layers(
  readFileSync(join(root, 'helix/styles/src/primitives.css'), 'utf8'),
  TOKENS.map(([name, value]) => ({ name: `--helix-${name}`, value: String(value) })),
)
const modules = {
  dark: (await import(join(theme, 'dark.generated.ts'))).dark,
  light: (await import(join(theme, 'light.generated.ts'))).light,
}

describe('the native token modules', () => {
  for (const scheme of ['light', 'dark']) {
    test(`hold the hex paint.mjs resolves for every color in ${scheme} mode`, () => {
      const written = modules[scheme]
      const colors = TOKENS.filter(([name]) => /^#/.test(String(written[name])))
      expect(colors.length).toBeGreaterThan(0)
      for (const [name, value] of colors) {
        expect({ [name]: written[name] }).toEqual({
          [name]: paint(String(value), declared, scheme),
        })
      }
    })
  }

  test('write a color as hex for every token in a color category', () => {
    for (const [name] of TOKENS.filter(([one]) => /^(color|scrollbar)-/.test(one))) {
      for (const written of Object.values(modules)) {
        expect({ [name]: written[name] }).toEqual({
          [name]: expect.stringMatching(/^#[\da-f]{6}([\da-f]{2})?$/),
        })
      }
    }
  })
})
