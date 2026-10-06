import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-tooltip'

/* A visual axis is a property whose whole mechanism is a selector, so both
 * halves of that are asserted here and neither is visible from the component.
 *
 * **The reflection**, set as a *property* rather than as an attribute. Written
 * in markup the rule matches whether or not anything reflects, which is why
 * this half went unnoticed on four families at once: `avatar-group.max` folded
 * nothing and `breadcrumb.href` lost eight pixels from every crumb, each with
 * the property reading back exactly what was set. The attribute is what a
 * stylesheet can reach; a script and every React consumer by default set the
 * property. Lit SSR emits reflected attributes, so the server's own markup is
 * where the two can be read meeting.
 *
 * **And the rule on the other side of it**, through `styles` rather than the
 * whole document: a sheet that stopped describing a value leaves an attribute
 * nothing acts on, which is the same axis broken from the other end.
 *
 * What neither half is, is a picture. Whether the value looks right is
 * `check:spec:visual`'s question and wants a browser. */
describe('tooltip visual axes', () => {
  test('material reflects, which is the only channel the sheet has to it', () => {
    // material: what the bubble is made of.
    const served = ssr(html`<helix-tooltip .material=${'glass'}></helix-tooltip>`)
    expect(hostTag(served, TAG)).toContain('material="glass"')
    expect(styles(served)).toContain(':host([material="glass"])')
  })

  test('and one that asked for no axis carries none', () => {
    /* Undefaulted, which is the rule a reflected property comes with: one
       with a default writes its attribute onto every host anybody renders,
       and the sheet then has to describe the resting arrangement as well as
       the departure.
       The axes here are `material`. */
    const bare = hostTag(ssr(html`<helix-tooltip></helix-tooltip>`), TAG)
    expect(bare).not.toContain('material=')
  })
})

describe('tooltip hooks', () => {
  test('the bubble’s words, corners, and room are each a hook with the token behind it', () => {
    const sheet = styles(ssr(html`<helix-tooltip content="Save"></helix-tooltip>`))
    expect(sheet).toContain('var(--tooltip-color, var(--helix-color-foreground-inverse))')
    expect(sheet).toContain('var(--tooltip-font-size, var(--helix-text-xs))')
    expect(sheet).toContain('var(--tooltip-padding, var(--helix-space-2xs) var(--helix-space-xs))')
    expect(sheet).toContain('var(--tooltip-radius, var(--helix-radii-sm))')
    expect(sheet).toContain('var(--tooltip-gap, var(--helix-space-2xs))')
    expect(sheet).toContain('var(--tooltip-border-color, var(--helix-color-border))')
  })
})
