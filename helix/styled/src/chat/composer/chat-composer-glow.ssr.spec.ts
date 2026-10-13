import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-chat-composer'

/* `glow` is a property whose mechanism is a selector, so both halves are
 * asserted: it reflects when set as a property, which is how React and a script
 * set it, and the sheet describes it. Whether it looks right is a browser's
 * question. */
describe('chat composer glow', () => {
  test('reflects, and the sheet draws it in place of the ring', () => {
    const served = ssr(html`<helix-chat-composer .glow=${true}></helix-chat-composer>`)
    expect(hostTag(served, TAG)).toContain('glow')
    expect(styles(served)).toContain(':host([glow]) [part="composer"]:focus-within')
  })

  test('and is not there unless asked for', () => {
    expect(hostTag(ssr(html`<helix-chat-composer></helix-chat-composer>`), TAG)).not.toContain(
      'glow',
    )
  })
})
