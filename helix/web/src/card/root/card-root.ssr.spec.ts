import { describe, expect, test } from 'bun:test'
import { render } from '@lit-labs/ssr'
import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js'
import { html } from 'lit'
import '../index.js'

const ssr = (template: ReturnType<typeof html>): string => collectResultSync(render(template))

describe('card server output', () => {
  const markup = ssr(html`
    <helix-card aria-labelledby="t">
      <h2 id="t" slot="header">Report</h2>
      Body
    </helix-card>
  `)

  test('renders without touching a DOM it does not have', () => {
    expect(markup).toContain('<helix-card')
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-color-surface')
  })

  test('every region is present in the shadow root', () => {
    for (const region of ['container', 'header', 'body', 'footer']) {
      expect(markup, region).toContain(`part="${region}"`)
    }
  })

  test('slotted content reaches the markup', () => {
    // Light DOM is in the response, so a crawler reads the card without JS.
    expect(markup).toContain('Report')
    expect(markup).toContain('slot="header"')
  })

  test('an empty region is hidden by CSS, not by JavaScript', () => {
    // The component cannot inspect its children on the server, so the rule has
    // to be a selector rather than a lifecycle hook. Quote style is the
    // formatter's choice, so match without it.
    expect(markup).toMatch(/:host\(:has\(\[slot=["']?footer["']?\]\)\)/)
  })
})
