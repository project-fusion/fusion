import { describe, expect, test } from 'bun:test'
import { html } from 'lit'
import { ssr } from '../../testing/ssr.js'
import '../index.js'

/**
 * Uncontrolled open state is the case that regressed.
 *
 * `defaultOpen` used to be seeded in `connectedCallback`, which SSR never
 * calls, so a `default-open` disclosure rendered collapsed on the server and
 * snapped open at hydration. That is the flash a user sees, and only the server
 * output shows it.
 */
describe('disclosure renders its real state on the server', () => {
  test('uncontrolled default-open renders open', () => {
    const markup = ssr(html`
      <helix-disclosure default-open><span slot="summary">S</span><p>Body</p></helix-disclosure>
    `)

    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-open')
    expect(markup).not.toMatch(/part="content"[^>]*\binert\b/)
  })

  test('uncontrolled default-closed renders closed', () => {
    const markup = ssr(html`
      <helix-disclosure><span slot="summary">S</span><p>Body</p></helix-disclosure>
    `)

    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toMatch(/part="content"[^>]*\binert\b/)
  })

  test('controlled open renders open', () => {
    const markup = ssr(html`
      <helix-disclosure open><span slot="summary">S</span><p>Body</p></helix-disclosure>
    `)

    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-open')
  })

  test('content is present in the markup even when closed', () => {
    // Unmounting closed content makes an open/close transition impossible and
    // hides the text from anything reading the server response.
    const markup = ssr(html`
      <helix-disclosure><span slot="summary">S</span><p>Findable</p></helix-disclosure>
    `)
    expect(markup).toContain('Findable')
  })
})
