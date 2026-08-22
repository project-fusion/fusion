import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('progress server output', () => {
  test('the track and the fill both ship, so the bar is right before hydration', () => {
    const markup = ssr(html`<helix-progress label="Uploading" value="62"></helix-progress>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'indicator')).toBe(true)
  })

  test('the fill is served at its real proportion, not at zero', () => {
    /* The whole reason the fraction is derived rather than measured. A bar that
       ships empty and fills on upgrade is a bar that animates from nothing on
       every page load, and says the wrong thing for as long as that takes. */
    expect(partTag(ssr(html`<helix-progress value="62"></helix-progress>`), 'indicator')).toContain(
      '--progress-fraction: 0.62',
    )
  })

  test('a value past its own total is served finished rather than overflowing', () => {
    expect(
      partTag(ssr(html`<helix-progress value="140"></helix-progress>`), 'indicator'),
    ).toContain('--progress-fraction: 1')
  })

  test('the host carries only what the consumer wrote', () => {
    // The semantics go through `ElementInternals`, so none of them are
    // attributes here, and `role` in particular must not be.
    expect(
      hostAttributes(
        ssr(html`<helix-progress label="Uploading" value="62"></helix-progress>`),
        'helix-progress',
      ),
    ).toEqual(['label', 'value'])
  })
})
