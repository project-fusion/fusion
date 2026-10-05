import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-timeline'

/* The two layout properties are selectors and nothing else, so what is held
   here is the reflection, set as a property, and the rule on the other side of
   it. Where the entries land is `timeline-geometry.dom.spec.ts`'s, in a
   browser. */
describe('timeline layouts', () => {
  test('layout and orientation reflect, which is the only channel the sheet has to them', () => {
    const served = ssr(
      html`<helix-timeline .layout=${'alternate'} .orientation=${'horizontal'}></helix-timeline>`,
    )
    expect(hostTag(served, TAG)).toContain('layout="alternate"')
    expect(hostTag(served, TAG)).toContain('orientation="horizontal"')
    expect(styles(served)).toContain(':host([layout="alternate"])')
    expect(styles(served)).toContain(':host([layout="opposite"])')
    expect(styles(served)).toContain(':host([orientation="horizontal"])')
  })

  test('a timeline that asked for no layout carries none', () => {
    const bare = hostTag(ssr(html`<helix-timeline></helix-timeline>`), TAG)
    expect(bare).not.toContain('layout=')
    expect(bare).not.toContain('orientation=')
  })
})
