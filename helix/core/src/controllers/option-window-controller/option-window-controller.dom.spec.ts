import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Host = HTMLElement & {
  current: string
  items: unknown[] | undefined
  updateComplete: Promise<boolean>
  window: import('./option-window-controller.js').OptionWindowController
}

beforeAll(async () => {
  registerDom()
  const { LitElement, html } = await import('lit')
  const { OptionWindowController } = await import('./option-window-controller.js')
  /* A list that draws `items` a window at a time, as Listbox does. */
  class WindowList extends LitElement {
    static tier = 'test-'
    static override properties = { current: {}, items: { attribute: false } }
    current = ''
    items: unknown[] | undefined = undefined
    window = new OptionWindowController(this, {
      current: () => this.current,
      items: () => this.items as never,
    })
    override render() {
      return html`<div part="items">${this.window.render() ?? html`<slot></slot>`}</div>`
    }
  }
  customElements.define('test-window-list', WindowList)
})

const list = async (items: unknown[] | undefined, current = ''): Promise<Host> => {
  document.body.innerHTML = '<test-window-list></test-window-list>'
  const host = document.body.firstElementChild as Host
  host.items = items
  host.current = current
  await host.updateComplete
  await host.updateComplete
  return host
}

const drawn = (host: Host): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[data-rows] > *') ?? []),
]

describe('a list whose options come as data', () => {
  test('draws its slot, and no window, without items', async () => {
    const host = await list(undefined)
    expect(host.window.records).toBeUndefined()
    expect(host.window.render()).toBeUndefined()
    expect(host.shadowRoot?.querySelector('slot')).not.toBeNull()
  })

  test('builds the records once for each array it is handed', async () => {
    const items = ['a', 'b']
    const host = await list(items)
    const first = host.window.records
    expect(host.window.records).toBe(first as never)
    host.items = [...items]
    expect(host.window.records).not.toBe(first as never)
  })

  test('draws a window as option elements of its tier, each with its place in the set', async () => {
    const host = await list(Array.from({ length: 500 }, (_, at) => `Row ${at}`))
    const rows = drawn(host)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(50)
    expect(rows[0]?.localName).toBe('test-option')
    expect(rows[0]?.getAttribute('aria-setsize')).toBe('500')
    expect(host.window.drawn).toEqual(rows as HTMLElement[])
  })

  test('keeps the option the keyboard is on drawn, after the window where it lies past it', async () => {
    const host = await list(
      Array.from({ length: 500 }, (_, at) => `Row ${at}`),
      'Row 400',
    )
    const last = drawn(host).at(-1)
    expect(last?.textContent).toBe('Row 400')
    expect(last?.getAttribute('aria-posinset')).toBe('401')
  })

  test('follows the highlight in two steps where it is not drawn in its place', async () => {
    const host = await list(
      Array.from({ length: 500 }, (_, at) => `Row ${at}`),
      'Row 400',
    )
    /* Drawn after the window rather than in its place, so not yet. */
    expect(host.window.follow(true)).toBe(false)
    /* A highlight that has not moved is not followed. */
    const near = await list(['a', 'b', 'c'], 'b')
    expect(near.window.follow(false)).toBe(false)
    expect(near.window.follow(true)).toBe(true)
  })
})
