import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('outline rail server output', () => {
  test('the marker reaches the host as written', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-outline marker="rail"></helix-headless-outline>`),
        'helix-headless-outline',
      ),
    ).toEqual(['marker'])
  })

  test('serves the ticks part hidden from assistive technology', () => {
    const markup = ssr(html`<helix-headless-outline marker="rail"></helix-headless-outline>`)
    expect(hasPart(markup, 'ticks')).toBe(true)
    expect(partTag(markup, 'ticks')).toContain('aria-hidden="true"')
  })

  test('wraps the heading and the navigation in the surface', () => {
    const markup = rendered(
      ssr(html`<helix-headless-outline marker="rail"></helix-headless-outline>`),
      'helix-headless-outline',
    )
    const surface = markup.indexOf('part="surface"')
    expect(surface).toBeGreaterThan(markup.indexOf('part="ticks"'))
    expect(markup.indexOf('part="heading"')).toBeGreaterThan(surface)
    expect(markup.indexOf('part="nav"')).toBeGreaterThan(markup.indexOf('part="heading"'))
  })

  test('serves neither ticks nor surface without the marker', () => {
    const markup = withoutStyles(ssr(html`<helix-headless-outline></helix-headless-outline>`))
    expect(markup).not.toContain('part="ticks"')
    expect(markup).not.toContain('part="surface"')
  })
})
