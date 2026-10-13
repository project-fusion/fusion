import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-dialog'

/* A visual axis is a property whose mechanism is a selector, so both halves
 * are asserted: it reflects when set as a property, and the sheet describes
 * it. Whether it looks right is a browser's question. */
describe('dialog visual axes', () => {
  test('material reflects, which is the only channel the sheet has to it', () => {
    const served = ssr(html`<helix-dialog .material=${'frosted'}></helix-dialog>`)
    expect(hostTag(served, TAG)).toContain('material="frosted"')
    expect(styles(served)).toContain(':host([material="frosted"])')
  })

  test('and one that asked for none carries none', () => {
    expect(hostTag(ssr(html`<helix-dialog></helix-dialog>`), TAG)).not.toContain('material=')
  })
})
