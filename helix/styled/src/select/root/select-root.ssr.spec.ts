import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('select server output', () => {
  test('the trigger ships as a real button, closed', () => {
    const trigger = partTag(ssr(html`<helix-select label="Owner"></helix-select>`), 'trigger')
    expect(trigger).toMatch(/<button/)
    expect(trigger).toContain('false')
  })

  test('the surface ships hidden rather than not at all', () => {
    // Present and hidden, so opening it after hydration is an attribute coming
    // off rather than a subtree arriving.
    const markup = ssr(html`<helix-select label="Owner"></helix-select>`)
    expect(hasPart(markup, 'surface')).toBe(true)
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  test('the trigger"s words come from the placeholder, since options are children', () => {
    // The server cannot see light-DOM children, so a value it cannot resolve
    // has to fall back to something rather than render blank.
    const markup = withoutStyles(
      ssr(html`<helix-select placeholder="Choose an owner" value="ross"></helix-select>`),
    )
    expect(markup).toContain('Choose an owner')
  })
})
