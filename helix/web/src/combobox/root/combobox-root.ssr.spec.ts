import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('combobox server output', () => {
  test('the control ships as a real input, collapsed', () => {
    const control = partTag(ssr(html`<helix-combobox label="Owner"></helix-combobox>`), 'control')
    expect(control).toMatch(/<input/)
    expect(control).toContain('role="combobox"')
    expect(control).toContain('aria-expanded="false"')
  })

  test('the surface ships hidden rather than not at all', () => {
    // Present and hidden, so opening it after hydration is an attribute coming
    // off rather than a subtree arriving.
    const markup = ssr(html`<helix-combobox label="Owner"></helix-combobox>`)
    expect(hasPart(markup, 'surface')).toBe(true)
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  test('the placeholder is what the server can say, since options are children', () => {
    /* The field's words are the chosen option's, and the server cannot see
       light-DOM children to resolve a value into any. So it renders the
       placeholder and the words arrive on hydration, which is the same bargain
       Select makes. */
    const control = partTag(
      ssr(html`<helix-combobox placeholder="Search owners" value="ross"></helix-combobox>`),
      'control',
    )
    expect(control).toContain('Search owners')
    expect(control).not.toContain('ross')
  })
})
