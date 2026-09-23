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

describe('lightbox server output', () => {
  test('the dialog ships closed, with the viewport inside it', () => {
    /* Present and shut, so what was opened is in the served HTML for anything
       reading the page. `showModal()` is a client-side act and there is no
       server equivalent: a dialog cannot be open in markup. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox label="Photos"></helix-headless-lightbox>`),
    )
    expect(hasPart(markup, 'dialog')).toBe(true)
    expect(partTag(markup, 'dialog')).toMatch(/<dialog/)
    expect(rendered(markup, 'helix-headless-lightbox')).toMatch(
      /<dialog[\s\S]*<slot><\/slot>[\s\S]*<\/dialog>/,
    )
  })

  test('the name is on the host through internals, not as an attribute', () => {
    // A label the server wrote as an attribute is one a consumer's own
    // `aria-label` could not override without the two disagreeing.
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox label="Photos"></helix-headless-lightbox>`),
    )
    expect(hostAttributes(markup, 'helix-headless-lightbox')).not.toContain('aria-label')
    expect(partTag(markup, 'dialog')).toContain('aria-label="Photos"')
  })

  test('the reading that says where the reader is ships empty', () => {
    /* A live region populated as it enters the document announces itself on
       arrival, which for a component that hydrates on load is every page load. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox label="Photos"></helix-headless-lightbox>`),
    )
    expect(hasPart(markup, 'live')).toBe(true)
    expect(partTag(markup, 'live')).toContain('role="status"')
    expect(rendered(markup, 'helix-headless-lightbox')).not.toMatch(/\d+ of \d+/)
  })

  test('the chrome slots are served, so a header is in the markup before hydration', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox label="Photos"></helix-headless-lightbox>`),
    )
    const inside = rendered(markup, 'helix-headless-lightbox')
    expect(inside).toContain('name="header"')
    expect(inside).toContain('name="footer"')
  })
})
