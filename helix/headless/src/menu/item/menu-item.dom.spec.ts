import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const row = async (attributes = ''): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-menu-item ${attributes}>Open</helix-headless-menu-item>`,
  )) as HTMLElement

/**
 * One menu row, and the contract that is the row's rather than the menu's.
 *
 * **The menu already proves the coordination**, which is roving focus, typeahead
 * and which row a chosen value came from. What the row decides alone is which
 * *element* it is, and that decision is invisible from the menu, because a menu
 * made of anchors and a menu made of divs behave identically until a reader
 * reaches one with a screen reader or a middle click.
 */
describe('one menu row', () => {
  /* The anchor is the row rather than something inside it. A `menuitem`
     containing a link loses its accessible name in Chromium, so `href` changes
     the tag and takes the role with it. Asserting the tag is the only way to
     see that: both shapes carry `part="item"` and both read the same. */
  test('becomes the anchor rather than wrapping one, and keeps the role on it', async () => {
    const linked = await row('href="/docs"')
    const item = part(linked, 'item')
    expect(item?.tagName).toBe('A')
    expect(item?.getAttribute('role')).toBe('menuitem')
    expect(item?.getAttribute('href')).toBe('/docs')
    expect(item?.querySelector('a')).toBeNull()

    const plain = await row()
    expect(part(plain, 'item')?.tagName).toBe('DIV')
  })

  /* A disabled anchor is not a thing the platform has, and `aria-disabled` alone
     still navigates, so a refusing row gives up the `href` rather than dressing
     it. This is the row's own judgment: the menu never sees the difference. */
  test('renders no destination when it is refusing, rather than a dressed one', async () => {
    const host = await row('href="/docs" disabled')
    const item = part(host, 'item')
    expect(item?.tagName).toBe('DIV')
    expect(item?.hasAttribute('href')).toBe(false)
    expect(item?.getAttribute('aria-disabled')).toBe('true')
    expect(item?.hasAttribute('tabindex')).toBe(false)
  })

  /* An unticked choice is still a choice, which is the whole reason `checkable`
     exists beside `checked`. Announced as a plain `menuitem` it would tell a
     reader its siblings are commands. */
  test('announces an unticked choice as a choice, not as a command', async () => {
    const off = await row('checkable')
    expect(part(off, 'item')?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(part(off, 'item')?.getAttribute('aria-checked')).toBe('false')

    const on = await row('checked')
    expect(part(on, 'item')?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(part(on, 'item')?.getAttribute('aria-checked')).toBe('true')

    const command = await row()
    expect(part(command, 'item')?.getAttribute('role')).toBe('menuitem')
    expect(part(command, 'item')?.hasAttribute('aria-checked')).toBe(false)
  })
})
