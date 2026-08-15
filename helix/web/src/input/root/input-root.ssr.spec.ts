import { describe, expect, test } from 'bun:test'
import { partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('input server output', () => {
  test('the control ships as an input, so it works before any script', () => {
    const markup = ssr(html`<helix-input label="Search"></helix-input>`)
    expect(partTag(markup, 'control')).toMatch(/<input\s/)
  })

  test('the type is in the served markup, which is what picks the keyboard', () => {
    // A phone chooses its keyboard from the parsed markup. Waiting for a
    // lifecycle hook would give the first render a text keyboard for an email.
    const markup = ssr(html`<helix-input label="Email" type="email"></helix-input>`)
    expect(partTag(markup, 'control')).toContain('type="email"')
  })

  test('the name and placeholder are served, not added on upgrade', () => {
    const markup = partTag(
      ssr(html`<helix-input name="q" placeholder="Search"></helix-input>`),
      'control',
    )
    expect(markup).toContain('name="q"')
    expect(markup).toContain('placeholder="Search"')
  })

  test('a field with no name carries no empty one', () => {
    // `nothing` rather than an empty string: `name=""` is a field the form would
    // try to submit under no name at all.
    const markup = partTag(ssr(html`<helix-input label="Search"></helix-input>`), 'control')
    expect(markup).not.toContain('name=')
    expect(markup).not.toContain('placeholder=')
  })

  test('required and read-only are served on the control', () => {
    const markup = partTag(
      ssr(html`<helix-input name="q" required read-only></helix-input>`),
      'control',
    )
    expect(markup).toContain('required')
    expect(markup).toContain('readonly')
  })

  test('the default value is in the field on the server', () => {
    // Seeded in `willUpdate`, which SSR calls, rather than in a hook it does
    // not: anything later would serve an empty field and fill it at hydration.
    const markup = ssr(html`<helix-input default-value="hello" name="q"></helix-input>`)
    expect(markup).toContain('hello')
  })
})
