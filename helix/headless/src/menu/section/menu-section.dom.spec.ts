import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }
type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const opened = async (): Promise<Menu> => {
  const host = (await mount(`<helix-headless-menu label="Edit">
    <button slot="trigger">Edit</button>
    <helix-headless-menu-section label="History">
      <helix-headless-menu-item value="undo">Undo</helix-headless-menu-item>
      <helix-headless-menu-item value="redo">Redo</helix-headless-menu-item>
    </helix-headless-menu-section>
    <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
  </helix-headless-menu>`)) as Menu
  host.open = true
  await host.updateComplete
  for (const one of host.querySelectorAll<Updatable>('*')) {
    await one.updateComplete
  }
  return host
}

describe('a menu section', () => {
  /* React Aria's MenuSection: rows under a heading are a group named by it,
     so a reader hears which group a row is in. */
  test('is a group named by its heading', async () => {
    const host = await opened()
    const section = host.querySelector('helix-headless-menu-section') as Updatable
    const group = part(section, 'section') as HTMLElement
    expect(group.getAttribute('role')).toBe('group')
    const heading = (group.getRootNode() as ShadowRoot).getElementById(
      group.getAttribute('aria-labelledby') ?? '',
    )
    expect(heading).toBe(part(section, 'heading') as HTMLElement | null)
    expect(heading?.textContent?.trim()).toBe('History')
  })

  test('its rows are the menu rows the arrow keys move through', async () => {
    const host = await opened()
    const rows = [...host.querySelectorAll('helix-headless-menu-item')]
    for (const _ of rows) {
      host.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
      )
    }
    expect(host.ownerDocument.activeElement).toBe(at(rows, 2))
  })

  test('a section with no heading draws none', async () => {
    const host = (await mount(
      '<helix-headless-menu-section><helix-headless-menu-item>Row</helix-headless-menu-item></helix-headless-menu-section>',
    )) as Updatable
    expect(part(host, 'heading')?.hasAttribute('hidden')).toBe(true)
  })
})
