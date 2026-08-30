import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Row = HTMLElement & { focusable: boolean; select(): void; updateComplete: Promise<boolean> }

const row = async (attributes = 'value="a"'): Promise<Row> =>
  (await mount(
    `<helix-headless-drilldown-item ${attributes}>Settings</helix-headless-drilldown-item>`,
  )) as Row

/**
 * One row, and the contract that is the row's rather than the stack's.
 *
 * **The drilldown already proves the navigation**, which is a row opening a page
 * and the trail back out of it. What the row owns alone is what element it is
 * and how it refuses, and neither is visible from the stack: a
 * `<div role="button">` with a click handler works under a pointer and cannot
 * be activated from a keyboard at all, and the stack passes either way.
 */
describe('one drilldown row', () => {
  /* A real `<button>`, because Enter and Space are behavior the platform gives
     one and gives nothing else. Same argument `Button` makes for rendering one
     rather than reproducing it. */
  test('is a real button, so the platform gives it Enter and Space', async () => {
    const item = part(await row(), 'item')
    expect(item?.tagName).toBe('BUTTON')
    expect(item?.getAttribute('type')).toBe('button')
  })

  /* `menuitem` because the stack says `role="menu"`. A menu whose children are
     buttons is not a menu: the two roles contradict each other, and a reader is
     told the count of items by one and the kind of them by the other. */
  test('answers to the role its container declares, not to the tag it renders', async () => {
    expect(part(await row(), 'item')?.getAttribute('role')).toBe('menuitem')
  })

  /* `aria-disabled` rather than `disabled`, so a row that cannot be chosen is
     still reachable and still announces why. `select()` is what refuses, and it
     refuses however it was reached, which a click-only spec would not show. */
  test('stays reachable while refusing, and refuses from the method too', async () => {
    const host = await row('value="a" disabled')
    const item = part(host, 'item')
    expect(item?.getAttribute('aria-disabled')).toBe('true')
    expect(item?.hasAttribute('disabled')).toBe(false)

    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    host.select()
    ;(item as HTMLElement).click()
    expect(heard).toBe(0)
  })

  /* The stack roves one tab stop across the page it is showing, so which row
     holds it is the stack's to say and the row's to render. */
  test('renders the tab stop the stack gave it, and none otherwise', async () => {
    const host = await row()
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('-1')
    host.focusable = true
    await host.updateComplete
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('0')
  })
})
