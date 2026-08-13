import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
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

  test('the link branch is chosen on the server, not after hydration', () => {
    // Deciding between button and anchor at hydration time would swap the
    // element under the user and lose the href to a crawler.
    const markup = ssr(html`<helix-button href="/contact">Contact</helix-button>`)
    const structure = withoutStyles(markup)
    expect(structure).toMatch(/<a\s+part="button"/)
    expect(structure).toContain('href="/contact"')
    expect(structure).not.toMatch(/<button\s+part="button"/)
  })

  test('opener protections are in the served markup', () => {
    const markup = ssr(html`<helix-button href="https://x.test" target="_blank">X</helix-button>`)
    expect(withoutStyles(markup)).toContain('rel="noreferrer noopener"')
  })

  test('a disabled link ships with no activatable anchor', () => {
    // The host keeps whatever attribute the consumer wrote, which is their
    // markup and not ours. What matters is the anchor: it has no destination to
    // follow and is out of the tab order.
    const anchor = partTag(ssr(html`<helix-button href="/x" disabled>X</helix-button>`), 'button')
    expect(anchor).toContain('aria-disabled="true"')
    expect(anchor).toContain('tabindex="-1"')
    expect(anchor).not.toContain('href')
  })

  test('unset properties leave no empty attributes on the host', () => {
    // `target` and `rel` reflected until they were told not to, so every button
    // ever rendered carried a bare `target rel` pair. Reflection is for values
    // CSS selects on, and no rule selects on either.
    const host = hostTag(ssr(html`<helix-button>Go</helix-button>`), 'helix-button')
    expect(host).toContain('appearance="neutral"')
    expect(host).not.toContain('target')
    expect(host).not.toContain('rel')
    expect(host).not.toContain('href')
  })

  test('declarative shadow DOM carries the styles', () => {
    const markup = ssr(html`<helix-button appearance="primary">Go</helix-button>`)
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-color-primary')
  })
})
