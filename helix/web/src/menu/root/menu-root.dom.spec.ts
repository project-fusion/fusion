import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion-io/testing/dom'

/* happy-dom before the element, and the import dynamic for that reason:
   `@customElement` runs on import, static imports are hoisted, and an element
   registered against the `customElements` happy-dom then replaces never
   upgrades. It mounts as a bare `HTMLElement` and every read comes back
   undefined, which a spec written defensively reports as a pass. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & {
  open: boolean
  toggleOpen(): boolean
  updateComplete: Promise<boolean>
}
type Item = HTMLElement & { checked: boolean; disabled: boolean; value: string }

const menu = async (rows = '<helix-menu-item value="copy">Copy</helix-menu-item>'): Promise<Menu> =>
  (await mount(
    `<helix-menu label="Actions"><button slot="trigger">Open</button>${rows}</helix-menu>`,
  )) as Menu

describe('menu', () => {
  test('the menu role is on the surface, not on the host', async () => {
    // The host holds the trigger as well as the panel, so it is not the menu:
    // it is the thing a menu hangs off. A role on it would tell a screen reader
    // the button was one of the commands.
    const el = await menu()
    expect(el.hasAttribute('role')).toBe(false)
    expect(role(el)).toBeNull()
    expect(el.shadowRoot?.querySelector('[part="menu"]')?.getAttribute('role')).toBe('menu')
  })

  test('asking to open is announced first, so it can be refused', async () => {
    // Through `toggleOpen`, which is the request. Assigning `open` is the
    // controlled path and is the consumer stating the answer rather than asking
    // for it, so there is nothing there to refuse.
    const el = await menu()
    el.addEventListener('helix-open', (event) => event.preventDefault())
    el.toggleOpen()
    await el.updateComplete
    expect(el.hasAttribute('data-open')).toBe(false)
  })

  test('a consumer that states open is obeyed rather than asked', async () => {
    const el = await menu()
    el.open = true
    await el.updateComplete
    expect(el.hasAttribute('data-open')).toBe(true)
  })

  test('a row announces its choice rather than acting on it', async () => {
    // The row dispatches and the consumer decides. A row that closed the menu
    // itself would be a second source of truth for whether it is open.
    const el = await menu()
    const item = el.querySelector('helix-menu-item') as Item
    let chosen = ''
    el.addEventListener('helix-select', (event) => {
      chosen = (event as CustomEvent<{ value: string }>).detail.value
    })
    // The row inside the shadow root, because that is what carries the handler.
    // A click on the host is a click on a wrapper and reaches nothing.
    item.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
    expect(chosen).toBe('copy')
  })

  test('a disabled row says nothing at all', async () => {
    const el = await menu('<helix-menu-item disabled value="copy">Copy</helix-menu-item>')
    const item = el.querySelector('helix-menu-item') as Item
    let heard = false
    el.addEventListener('helix-select', () => {
      heard = true
    })
    item.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
    expect(heard).toBe(false)
  })

  test('a checkable row is a checkbox to a screen reader, not a command', async () => {
    const el = await menu('<helix-menu-item checkable value="wrap">Wrap</helix-menu-item>')
    const item = el.querySelector('helix-menu-item') as Item
    const row = item.shadowRoot?.querySelector('[part="item"]')
    expect(row?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(row?.getAttribute('aria-checked')).toBe('false')
  })
})
