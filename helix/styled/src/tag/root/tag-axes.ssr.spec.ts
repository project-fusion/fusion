import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-tag'

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
describe('tag visual axes', () => {
  test('emphasis reflects, which is the only channel the sheet has to it', () => {
    // emphasis: how filled the chip is drawn.
    const served = ssr(html`<helix-tag .emphasis=${'outlined'}></helix-tag>`)
    expect(hostTag(served, TAG)).toContain('emphasis="outlined"')
    expect(styles(served)).toContain(':host([emphasis="outlined"])')
  })

  test('tone reflects, which is the only channel the sheet has to it', () => {
    // tone: what the chip means.
    const served = ssr(html`<helix-tag .tone=${'danger'}></helix-tag>`)
    expect(hostTag(served, TAG)).toContain('tone="danger"')
    expect(styles(served)).toContain(':host([tone="danger"])')
  })

  test('and one that asked for no axis carries none', () => {
    /* Undefaulted, which is the rule a reflected property comes with: one
       with a default writes its attribute onto every host anybody renders,
       and the sheet then has to describe the resting arrangement as well as
       the departure.
       The axes here are `emphasis` and `tone`. */
    const bare = hostTag(ssr(html`<helix-tag></helix-tag>`), TAG)
    expect(bare).not.toContain('emphasis=')
    expect(bare).not.toContain('tone=')
  })
})
