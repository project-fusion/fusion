import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  rendered,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('button server output', () => {
  test('is keyboard reachable before any JavaScript runs', () => {
    // `delegatesFocus` is a shadow root option, so it only reaches the browser
    // if it serializes onto the declarative template. If it did not, the button
    // would be unfocusable until hydration.
    const markup = withoutStyles(ssr(html`<helix-button>Go</helix-button>`))
    expect(rendered(markup, 'helix-button')).toContain('shadowrootdelegatesfocus')
    expect(hasPart(markup, 'button')).toBe(true)
    expect(rendered(markup, 'helix-button')).toMatch(/<button\s+part="button"/)
  })

  test('the served control is a button, with no anchor branch to choose', () => {
    const structure = withoutStyles(ssr(html`<helix-button>Go</helix-button>`))
    expect(rendered(structure, 'helix-button')).toMatch(/<button\s+part="button"/)
    expect(structure).not.toMatch(/<a\s+part="button"/)
  })

  test('the host carries nothing the consumer did not write', () => {
    // A reflected property with a default writes its attribute on upgrade, and
    // the host then holds an attribute the consumer's markup never had. React
    // reports that as a hydration mismatch, so the host has to start bare.
    expect(hostAttributes(ssr(html`<helix-button>Go</helix-button>`), 'helix-button')).toEqual([])
  })

  test('declarative shadow DOM carries the styles', () => {
    // The appearances live in the base layer now, paired with the `data-button`
    // recipe so one declaration serves this control and a consumer's own
    // anchor. What ships in the shadow root is what a document rule cannot
    // reach, which is why the focus ring is the thing to assert on here.
    const served = ssr(html`<helix-button emphasis="solid" tone="primary">Go</helix-button>`)
    expect(rendered(served, 'helix-button')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--helix-color-focus-ring')
  })
})
