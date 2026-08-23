import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('radio group server output', () => {
  test('the question is served, so the set is named before any script', () => {
    const markup = ssr(html`<helix-base-radio-group label="Label"></helix-base-radio-group>`)
    expect(withoutStyles(markup)).toContain('Label')
    expect(hasPart(markup, 'items')).toBe(true)
  })

  test('the semantics are on internals, so the host carries no role', () => {
    /* Which is the whole reason they go through internals: an attribute written
       at upgrade is markup a React consumer's server output never had, and
       hydration reports it. */
    const markup = ssr(html`<helix-base-radio-group label="L"></helix-base-radio-group>`)
    expect(hostTag(markup)).not.toContain('role=')
  })

  test('which item is chosen is not a server fact', () => {
    /* The answer is written onto the radios, and those are light-DOM children:
       `place` runs in `updated`, client side, and the server has no tree to
       write onto. So nothing the group serves says which one is on, and this
       says that rather than comparing two renders, which differ anyway by the
       attribute the consumer wrote on the host. */
    const chosen = ssr(
      html`<helix-base-radio-group default-value="two" label="L"></helix-base-radio-group>`,
    )
    expect(withoutStyles(chosen)).not.toContain('selected')
  })

  test('a group with nothing to describe serves no description', () => {
    const markup = ssr(html`<helix-base-radio-group label="L"></helix-base-radio-group>`)
    expect(hasPart(markup, 'hint')).toBe(false)
    expect(hasPart(markup, 'feedback')).toBe(false)
  })
})
