import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-card'

/* A visual axis is a property whose whole mechanism is a selector, so both
 * halves of that are asserted here and neither is visible from the component.
 *
 * **The reflection**, set as a *property* rather than as an attribute. Written
 * in markup the rule matches whether or not anything reflects, which is why
 * this half went unnoticed on four families at once: `avatar-group.max` folded
 * nothing, `breadcrumb.href` lost eight pixels from every crumb. The attribute
 * is what a stylesheet can reach, a consumer's script and every React consumer
 * by default set the property, and nothing anywhere says the two have stopped
 * meeting. Lit SSR emits reflected attributes, so the server's own markup is
 * where the meeting can be read.
 *
 * **And the rule on the other side of it**, through `styles` rather than the
 * whole document: a sheet that stopped describing a value leaves an attribute
 * nothing acts on, which is the same axis broken from the opposite end.
 *
 * What neither half is, is a picture. Whether `elevated` looks raised is
 * `check:spec:visual`'s question and wants a browser. */
describe('card visual axes', () => {
  test('separation reflects from the property, which is the only channel the sheet has', () => {
    const served = ssr(html`<helix-card .separation=${'elevated'}></helix-card>`)
    expect(hostTag(served, TAG)).toContain('separation="elevated"')
    expect(styles(served)).toContain(':host([separation="elevated"])')
  })

  /* `plain` is no frame at all, and it kept the theme's surface shadow, so a
     plain card in a theme that separates with shadows still floated. */
  test('plain clears the shadow along with the fill and the edge', () => {
    const served = ssr(html`<helix-card .separation=${'plain'}></helix-card>`)
    const rule = styles(served).split(':host([separation="plain"]) {')[1]?.split('}')[0] ?? ''
    expect(rule).toContain('--card-shadow: none')
  })

  test('material reflects too, and the sheet describes the value asked for', () => {
    const served = ssr(html`<helix-card .material=${'frosted'}></helix-card>`)
    expect(hostTag(served, TAG)).toContain('material="frosted"')
    expect(styles(served)).toContain(':host([material="frosted"])')
  })

  test('and a card that asked for neither carries neither', () => {
    /* Undefaulted, which is the rule a reflected property comes with: one with
       a default writes its attribute onto every card anybody renders, and the
       sheet then has to describe the resting state as well as the departure. */
    const bare = hostTag(ssr(html`<helix-card></helix-card>`), TAG)
    expect(bare).not.toContain('separation=')
    expect(bare).not.toContain('material=')
  })
})
