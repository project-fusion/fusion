import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('radio group server output', () => {
  test('the question is served, so the set is named before any script', () => {
    /* `toContain('Label')` against the whole render passed on the consumer's
       own `label="Label"` two characters into the host tag, so it held with the
       label deleted from the template. The name is the fallback of the label
       slot, which is inside the shadow root and nowhere else. */
    const markup = ssr(
      html`<helix-headless-radio-group label="Label"></helix-headless-radio-group>`,
    )
    expect(hasPart(markup, 'label')).toBe(true)
    expect(rendered(markup, 'helix-headless-radio-group')).toContain('Label')
    expect(hasPart(markup, 'items')).toBe(true)
  })

  test('the semantics are on internals, so the host carries no role', () => {
    /* Which is the whole reason they go through internals: an attribute written
       at upgrade is markup a React consumer's server output never had, and
       hydration reports it. */
    const markup = ssr(html`<helix-headless-radio-group label="L"></helix-headless-radio-group>`)
    expect(hostTag(markup, 'helix-headless-radio-group')).not.toContain('role=')
  })

  test('which item is chosen is not a server fact', () => {
    /* The answer is written onto the radios, and those are light-DOM children:
       `place` runs in `updated`, client side, and the server has no tree to
       write onto. So nothing the group serves says which one is on, and this
       says that rather than comparing two renders, which differ anyway by the
       attribute the consumer wrote on the host. */
    const chosen = ssr(
      html`<helix-headless-radio-group default-value="two" label="L"></helix-headless-radio-group>`,
    )
    expect(withoutStyles(chosen)).not.toContain('selected')
  })

  test('a group with nothing to describe serves no description', () => {
    const markup = ssr(html`<helix-headless-radio-group label="L"></helix-headless-radio-group>`)
    expect(hasPart(markup, 'hint')).toBe(false)
    expect(hasPart(markup, 'feedback')).toBe(false)
  })
  test('a group showing feedback renders on a server, where it has no items to point at', () => {
    /* Feedback sets a custom validity, which asks the group where focus would
       land, and the server has no children to answer from. It threw there,
       and every example with feedback failed to serve. */
    const markup = ssr(
      html`<helix-headless-radio-group feedback="Choose one to continue" label="L"></helix-headless-radio-group>`,
    )
    expect(rendered(markup, 'helix-headless-radio-group')).toContain('Choose one to continue')
  })
})
