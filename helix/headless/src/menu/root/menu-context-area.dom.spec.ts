import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & {
  contextTarget: Element | undefined
  open: boolean
  showAt(point: { x: number; y: number }, target?: Element): void
  updateComplete: Promise<unknown>
}

const ask = (target: Element, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: 60,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

/** A table the menu serves from outside it, one row a target. */
const table = async (): Promise<{ menu: Menu; rows: HTMLElement[] }> => {
  const holder = await mount(`<div>
    <table id="files">
      <thead><tr><th>Name</th></tr></thead>
      <tbody><tr><td>Report.pdf</td></tr><tr><td>Plan.key</td></tr></tbody>
    </table>
    <helix-headless-menu context for="files" targets="tbody tr" label="File">
      <helix-headless-menu-item value="open">Open</helix-headless-menu-item>
    </helix-headless-menu>
  </div>`)
  const menu = holder.querySelector('helix-headless-menu') as Menu
  await menu.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 50))
  return { menu, rows: [...holder.querySelectorAll('tbody tr')] as HTMLElement[] }
}

describe('a context menu for an area outside it', () => {
  test('opens over a row the area names, with the row as its target', async () => {
    const { menu, rows } = await table()
    const heard: Array<Element | undefined> = []
    menu.addEventListener('helix-before-open', () => heard.push(menu.contextTarget))
    const event = ask(rows[1]?.querySelector('td') as Element)
    await menu.updateComplete
    expect(event.defaultPrevented).toBe(true)
    expect(menu.open).toBe(true)
    expect(menu.contextTarget).toBe(rows[1])
    expect(heard).toEqual([rows[1]])
  })

  test('leaves a request over none of its targets to the page', async () => {
    const { menu } = await table()
    const header = document.querySelector('thead th') as Element
    const event = ask(header)
    await menu.updateComplete
    expect(event.defaultPrevented).toBe(false)
    expect(menu.open).toBe(false)
  })

  test('leaves Shift with a right-click to the browser', async () => {
    const { menu, rows } = await table()
    const event = ask(rows[0] as Element, { shiftKey: true })
    await menu.updateComplete
    expect(event.defaultPrevented).toBe(false)
    expect(menu.open).toBe(false)
  })

  test('opens from Shift+F10 on the area, at the target’s corner', async () => {
    const { menu, rows } = await table()
    rows[0]?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'F10',
        shiftKey: true,
      }),
    )
    await menu.updateComplete
    expect(menu.open).toBe(true)
    expect(menu.contextTarget).toBe(rows[0])
  })
})

describe('showAt', () => {
  test('opens the menu at a point, with the target it is given', async () => {
    const { menu } = await table()
    const thing = document.createElement('span')
    menu.showAt({ x: 12, y: 34 }, thing)
    await menu.updateComplete
    expect(menu.open).toBe(true)
    expect(menu.contextTarget).toBe(thing)
    expect(menu.shadowRoot?.getElementById('point')?.getAttribute('style')).toContain(
      'translate: 12px 34px',
    )
  })
})
