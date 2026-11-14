import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * A menu is a sheet along the window's bottom edge in a window narrower than
 * 30rem, and a popover against its trigger in a wider one, as a phone draws
 * it. **`matchMedia` is stood in for**, since happy-dom does not evaluate a
 * range query against the window.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const real = window.matchMedia

afterEach(() => {
  window.matchMedia = real
})

/** A window that is narrower than 30rem while `narrow.matches` holds. */
const windowOf = (narrow: { matches: boolean }) => {
  window.matchMedia = (() => ({
    addEventListener: () => {},
    get matches() {
      return narrow.matches
    },
    removeEventListener: () => {},
  })) as never
}

type Menu = Updatable & { open: boolean; presentation: string }

const menu = async (): Promise<Menu> => {
  const host = (await mount(`<helix-headless-menu label="Actions">
    <button slot="trigger">Actions</button>
    <helix-headless-menu-item value="a">Rename</helix-headless-menu-item>
  </helix-headless-menu>`)) as Menu
  await settle(host)
  return host
}

describe('a menu’s presentation', () => {
  test('is a sheet in a narrow window, in no placed state, and a popover where it asks for one', async () => {
    windowOf({ matches: true })
    const host = await menu()
    host.open = true
    await settle(host)
    expect(hasState(host, 'sheet')).toBe(true)
    expect(['placed-bottom', 'aligned-start'].some((state) => hasState(host, state))).toBe(false)
    host.presentation = 'popover'
    await settle(host)
    expect(hasState(host, 'sheet')).toBe(false)
  })

  test('is a popover in a wide window, and a sheet where it asks for one', async () => {
    windowOf({ matches: false })
    const host = await menu()
    expect(hasState(host, 'sheet')).toBe(false)
    host.presentation = 'sheet'
    await settle(host)
    expect(hasState(host, 'sheet')).toBe(true)
  })
})
