import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('icon server output', () => {
  test('the glyph is in the served markup, so the picture is there before any script runs', () => {
    const markup = withoutStyles(ssr(html`<helix-icon name="gear"></helix-icon>`))
    expect(partTag(markup, 'svg')).toMatch(/^<svg\s/)
    expect(rendered(markup, 'helix-icon')).toMatch(/<(path|polyline|circle|line)\s/)
  })

  test('decoration by default, and content once it is labeled', () => {
    expect(partTag(ssr(html`<helix-icon name="gear"></helix-icon>`), 'svg')).toContain(
      'aria-hidden="true"',
    )
    const labeled = partTag(
      ssr(html`<helix-icon name="warning" label="Warning"></helix-icon>`),
      'svg',
    )
    expect(labeled).toContain('role="img"')
    expect(labeled).toContain('aria-label="Warning"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(html`<helix-icon name="gear"></helix-icon>`), 'helix-icon')).toEqual([
      'name',
    ])
  })

  test('declarative shadow DOM carries the sizing', () => {
    const served = ssr(html`<helix-icon name="gear"></helix-icon>`)
    expect(rendered(served, 'helix-icon')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--icon-size')
  })
})
