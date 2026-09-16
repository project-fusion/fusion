import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('icon button server output', () => {
  const served = ssr(html`<helix-icon-button label="Settings">i</helix-icon-button>`)
  const markup = withoutStyles(served)

  test('is keyboard reachable before any JavaScript runs', () => {
    // `delegatesFocus` is a shadow root option, so it only reaches the browser
    // if it serializes onto the declarative template.
    expect(rendered(markup, 'helix-icon-button')).toContain('shadowrootdelegatesfocus')
    expect(hasPart(markup, 'button')).toBe(true)
    expect(partTag(markup, 'button')).toMatch(/^<button\s/)
  })

  test('the accessible name is served, since the glyph says nothing', () => {
    expect(partTag(markup, 'button')).toContain('aria-label="Settings"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-icon-button')).toEqual(['label'])
    expect(
      hostAttributes(
        ssr(
          html`<helix-icon-button emphasis="solid" label="Go" tone="primary">i</helix-icon-button>`,
        ),
        'helix-icon-button',
      ),
    ).toEqual(['emphasis', 'label', 'tone'])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(rendered(markup, 'helix-icon-button')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--icon-button-size')
  })
})
