import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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

  /**
   * **An empty radio reads as an empty mark.** Its edge is the mark ink. In
   * the rule ink, a divider's 1.1:1, the edge vanished around the hole the box
   * punches through to the page, so in a card in dark mode an unchosen radio
   * drew as a solid dark shape.
   */
  test('at rest it is an empty outline in the mark ink', () => {
    const sheet = readFileSync(new URL('./radio-root.generated.css', import.meta.url), 'utf8')
    const rule = sheet.slice(sheet.indexOf('[part="box"] {'))
    const resting = rule.slice(0, rule.indexOf('}'))
    expect(resting).toContain('--helix-color-foreground-subtle')
    expect(resting).not.toContain('--helix-color-border)')
    expect(resting).toContain('transparent)')
  })
})
