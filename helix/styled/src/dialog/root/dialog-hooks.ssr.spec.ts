import { describe, expect, test } from 'bun:test'
import { ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('dialog hooks', () => {
  test('the panel’s fill, words, and corners are each a hook with the token behind it', () => {
    /* Drawer had all three and Dialog none, so a page restyling both overlays
       wrote rules for one and a `::part` override for the other. */
    const sheet = styles(ssr(html`<helix-dialog label="Rename"></helix-dialog>`))
    expect(sheet).toContain('var(--dialog-background-color, var(--helix-color-surface-overlay))')
    expect(sheet).toContain('var(--dialog-color, var(--helix-color-foreground))')
    expect(sheet).toContain('var(--dialog-radius, var(--helix-radii-sm))')
  })
})
