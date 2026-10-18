import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/* The cascade across shadow roots is a browser's, so the rule itself is read: a
   `[data-color-mode]` scope re-declares the heading ink a card names, except on
   the surfaces that name it. The layout spec in `card-root.dom.spec.ts` draws
   a dark scope inside a light card. */
describe('card heading ink in a nested color mode', () => {
  test('is reset on every color-mode scope but the card and node that set it', () => {
    const modes = readFileSync(
      new URL('../../../../styles/src/_modes.css', import.meta.url),
      'utf8',
    )
    expect(modes).toMatch(
      /\[data-color-mode\]:not\(helix-card, helix-canvas-node\) \{\s*--_heading-ink: initial/,
    )
  })
})
