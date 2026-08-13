import { describe, expect, test } from 'bun:test'
import { render } from '@lit-labs/ssr'
import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js'
import { html } from 'lit'
import '../index.js'

/**
 * Renders to the string a browser receives before any JavaScript runs.
 *
 * A DOM spec cannot catch anything here: it observes the element after
 * hydration, when everything already looks correct. These bugs are visible only
 * in the server output.
 */
const ssr = (template: ReturnType<typeof html>): string => collectResultSync(render(template))

const hostOf = (markup: string, tag: string): string =>
  markup.match(new RegExp(`<${tag}[^>]*>`))?.[0] ?? ''

describe('card server output', () => {
  test('renders without throwing', () => {
    // SSR has no DOM. A component that calls querySelector during render or
    // willUpdate throws here, which is exactly how this suite earns its place.
    expect(() =>
      ssr(html`
        <helix-card>
          <helix-card-header><helix-card-title>Report</helix-card-title></helix-card-header>
        </helix-card>
      `),
    ).not.toThrow()
  })

  test('carries its role', () => {
    const markup = ssr(html`<helix-card><helix-card-body>B</helix-card-body></helix-card>`)
    expect(hostOf(markup, 'helix-card')).toContain('role="group"')
  })

  test('a consumer-supplied name survives to the server', () => {
    // The only naming that can exist server-side, because adopting a title
    // requires reading the light DOM and the server has none.
    const markup = ssr(html`
      <helix-card aria-labelledby="mine">
        <helix-card-title id="mine">T</helix-card-title>
      </helix-card>
    `)
    expect(hostOf(markup, 'helix-card')).toContain('aria-labelledby="mine"')
  })

  test('carries no dangling reference when unnamed', () => {
    const markup = ssr(html`<helix-card><helix-card-body>B</helix-card-body></helix-card>`)
    expect(hostOf(markup, 'helix-card')).not.toContain('aria-labelledby')
  })

  test('the reference is never inside the shadow root', () => {
    // A reference there could not resolve to a light-DOM title in any browser.
    const markup = ssr(html`
      <helix-card aria-labelledby="mine"><helix-card-title id="mine">T</helix-card-title></helix-card>
    `)
    expect(markup.slice(markup.indexOf('<template'))).not.toContain('aria-labelledby')
  })

  test('declarative shadow DOM carries the styles', () => {
    const markup = ssr(html`<helix-card><helix-card-body>B</helix-card-body></helix-card>`)
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-color-surface')
  })
})
