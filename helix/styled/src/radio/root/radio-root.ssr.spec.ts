import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../radio/group/radio-group.js'

describe('radio server output', () => {
  test('the choice ships as a real radio, named by its own words', () => {
    const markup = ssr(html`<helix-radio value="one">Option One</helix-radio>`)
    expect(partTag(markup, 'item')).toContain('role="radio"')
    expect(rendered(markup, 'helix-radio')).toContain('<slot></slot>')
  })

  /**
   * **A set nothing has answered for is still reachable.**
   *
   * `selected` and `focusable` are both the group's word, and the group says
   * either by reading its children: a server has none. Served as `-1` that left
   * every choice out of the tab order and the whole set impossible to enter,
   * which is the fault `focusable` was added to prevent, arriving through the
   * one render `focusable` cannot be written in.
   */
  test('a choice nothing has answered for is in the tab order rather than out of it', () => {
    expect(partTag(ssr(html`<helix-radio value="one"></helix-radio>`), 'item')).toContain(
      'tabindex="0"',
    )
  })

  test('which choice is on is not a server fact, so nothing on the group says it is', () => {
    /* The answer is written onto the radios, and those are light-DOM children
       the group has no tree to reach on a server. The headless group's own
       server spec records this in full; asserted here because this is the tier
       a consumer ships and the limit travels with it. */
    const group = ssr(html`<helix-radio-group default-value="two" label="L"></helix-radio-group>`)
    expect(rendered(group, 'helix-radio-group')).not.toContain('selected')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(ssr(html`<helix-radio value="one"></helix-radio>`), 'helix-radio'),
    ).toEqual(['value'])
  })
})
