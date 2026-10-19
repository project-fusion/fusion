import '@fusion.dev/helix-testing/dom/register'
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

  test('a plain button is told it opens a menu a frame after the first render, and then each change', async () => {
    const host = (await mount(`<helix-headless-menu label="Actions">
      <button slot="trigger">Actions</button>
      <helix-headless-menu-item value="a">Rename</helix-headless-menu-item>
    </helix-headless-menu>`)) as Updatable & { open: boolean; whenSettled: Promise<void> }
    const button = host.querySelector('button') as HTMLButtonElement
    /* Not in the first render, which a framework may still be hydrating. */
    expect(button.hasAttribute('aria-expanded')).toBe(false)
    await host.whenSettled
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    host.open = true
    await settle(host)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  test('a plain button that says its own state is left to the page', async () => {
    const host = (await mount(`<helix-headless-menu label="Actions">
      <button slot="trigger" aria-expanded="false">Actions</button>
      <helix-headless-menu-item value="a">Rename</helix-headless-menu-item>
    </helix-headless-menu>`)) as Updatable & { open: boolean; whenSettled: Promise<void> }
    const button = host.querySelector('button') as HTMLButtonElement
    await host.whenSettled
    host.open = true
    await settle(host)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.hasAttribute('aria-haspopup')).toBe(false)
  })

  /* A component that wraps a menu forwards its own trigger slot into the
     menu's, so the element assigned there is a `<slot>`. Video Playlist's menu
     does, and the menu warned that its own `<slot>` could not be told. */
  describe('forwarded through another slot', () => {
    const forwarding = 'helix-test-forwarded-menu'
    beforeAll(() => {
      customElements.define(
        forwarding,
        class extends HTMLElement {
          connectedCallback(): void {
            this.attachShadow({ mode: 'open' }).innerHTML = `<helix-headless-menu label="Actions">
              <slot name="trigger" slot="trigger">
                <button type="button" aria-haspopup="menu" aria-expanded="false">Actions</button>
              </slot>
              <helix-headless-menu-item value="a">Rename</helix-headless-menu-item>
            </helix-headless-menu>`
          }
        },
      )
    })

    const reported = async (markup: string): Promise<{ host: HTMLElement; kinds: string[] }> => {
      const kinds: string[] = []
      const store = globalThis as Record<symbol, unknown>
      const slot = Symbol.for('fusion.dev/helix/runtime')
      const before = store[slot]
      store[slot] = (event: { kind: string }) => {
        kinds.push(event.kind)
        return true
      }
      try {
        const host = await mount(markup)
        const menu = host.shadowRoot?.querySelector('helix-headless-menu') as Updatable
        await settle(menu)
        return { host, kinds }
      } finally {
        store[slot] = before
      }
    }

    test('tells the button the wrapper renders, and says nothing about the slot', async () => {
      const { kinds } = await reported(`<${forwarding}></${forwarding}>`)
      expect(kinds).not.toContain('untold-trigger')
    })

    test('tells a trigger slotted into the wrapper that it opens a menu', async () => {
      const { host } = await reported(
        `<${forwarding}><helix-headless-button slot="trigger">Actions</helix-headless-button></${forwarding}>`,
      )
      const trigger = host.querySelector('helix-headless-button') as Updatable
      await settle(trigger)
      const button = trigger.shadowRoot?.querySelector('button')
      expect(button?.getAttribute('aria-haspopup')).toBe('menu')
      expect(button?.getAttribute('aria-expanded')).toBe('false')
    })
  })
})
