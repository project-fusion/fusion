import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  hostTag,
  partTag,
  ssr,
  withoutStyles,
} from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('button server output', () => {
  test('is keyboard reachable before any JavaScript runs', () => {
    // `delegatesFocus` is a shadow root option, so it only reaches the browser
    // if it serializes onto the declarative template. If it did not, the button
    // would be unfocusable until hydration.
    const markup = ssr(html`<helix-button>Go</helix-button>`)
    expect(markup).toContain('shadowrootdelegatesfocus')
    expect(hasPart(markup, 'button')).toBe(true)
    expect(withoutStyles(markup)).toMatch(/<button\s+part="button"/)
  })

  test('the served control is a button, with no anchor branch to choose', () => {
    const structure = withoutStyles(ssr(html`<helix-button>Go</helix-button>`))
    expect(structure).toMatch(/<button\s+part="button"/)
    expect(structure).not.toMatch(/<a\s+part="button"/)
  })

  test('the host carries nothing the consumer did not write', () => {
    // `target` and `rel` reflected until they were told not to, so every button
    // ever rendered carried a bare `target rel` pair. `appearance` and `size`
    // then reflected their defaults, which is the same bug with a value: the
    // host ends up holding an attribute the consumer's markup never had.
    expect(hostAttributes(ssr(html`<helix-button>Go</helix-button>`), 'helix-button')).toEqual([])
  })

  test('declarative shadow DOM carries the styles', () => {
    // The appearances live in the base layer now, paired with the `data-button`
    // recipe so one declaration serves this control and a consumer's own
    // anchor. What ships in the shadow root is what a document rule cannot
    // reach, which is why the focus ring is the thing to assert on here.
    const markup = ssr(html`<helix-button appearance="primary">Go</helix-button>`)
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-color-focus-ring')
  })
})
