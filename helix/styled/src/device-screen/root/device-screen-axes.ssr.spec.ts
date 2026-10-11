import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-device-screen'

/* A visual axis is a property whose whole mechanism is a selector, so the
   reflection is asserted from a property, which is what a script and a React
   consumer set, and the rule on the other side of it from the sheet. */
describe('device screen visual axes', () => {
  test('separation reflects, which is the only channel the sheet has to it', () => {
    const served = ssr(
      html`<helix-device-screen label="A" .separation=${'plain'}></helix-device-screen>`,
    )
    expect(hostTag(served, TAG)).toContain('separation="plain"')
    expect(styles(served)).toContain(':host([separation="plain"])')
  })

  test('shape and the buttons’ placement reflect for the same reason', () => {
    const served = ssr(
      html`<helix-device-screen label="A" .shape=${'circle'} .controlsPlacement=${'end'}></helix-device-screen>`,
    )
    expect(hostTag(served, TAG)).toContain('shape="circle"')
    expect(hostTag(served, TAG)).toContain('controls-placement="end"')
    expect(styles(served)).toContain(':host([shape="circle"])')
    expect(styles(served)).toContain(':host([controls-placement="end"])')
  })

  test('and one that asked for no axis carries none', () => {
    const bare = hostTag(ssr(html`<helix-device-screen label="A"></helix-device-screen>`), TAG)
    expect(bare).not.toContain('separation=')
    expect(bare).not.toContain('shape=')
    expect(bare).not.toContain('controls-placement=')
  })
})
