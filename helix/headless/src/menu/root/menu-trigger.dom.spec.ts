import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * A menu's trigger says it opens a menu.
 *
 * Read from Chromium's tree, it was a plain button that reported collapsed and
 * expanded and no popup, so a reader was not told a menu was behind it.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

describe('a menu trigger', () => {
  test('says it opens a menu, inside its own shadow root', async () => {
    const host = (await mount(`<helix-headless-menu label="Actions">
      <helix-headless-button slot="trigger">Actions</helix-headless-button>
      <helix-headless-menu-item value="a">Rename</helix-headless-menu-item>
    </helix-headless-menu>`)) as Updatable
    await settle(host)
    const trigger = host.querySelector('helix-headless-button') as Updatable
    await settle(trigger)
    const button = trigger.shadowRoot?.querySelector('button')
    expect(button?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false)
  })
})
