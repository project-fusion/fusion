import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Windowed = HTMLElement & {
  grid: boolean
  updateComplete: Promise<boolean>
  virtualize: { window: { after: number; before: number; first: number; last: number } }
  windowed: boolean
}

const settle = async (host: Windowed): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
  }
}

/** A table of `count` rows, each with its number and a word. */
const table = async (count: number, attributes = 'windowed'): Promise<Windowed> => {
  const rows = Array.from(
    { length: count },
    (_, at) =>
      `<helix-headless-table-row value="r${at}"><helix-headless-table-cell>Row ${at + 1}</helix-headless-table-cell><helix-headless-table-cell>${at}</helix-headless-table-cell></helix-headless-table-row>`,
  ).join('')
  const host = (await mount(
    `<helix-headless-table label="Builds" ${attributes}><helix-headless-table-column>Name</helix-headless-table-column><helix-headless-table-column>Number</helix-headless-table-column>${rows}</helix-headless-table>`,
  )) as Windowed
  await settle(host)
  return host
}

/** A row's place, as its internals tell the accessibility tree. */
const rowIndex = (row: Element | null): string | null =>
  (row as unknown as { internals: ElementInternals }).internals.ariaRowIndex

/* A table of thousands of rows laid every one of them out. */
describe('a windowed table', () => {
  test('draws a window of its rows, and says how many there are and where each stands', async () => {
    const host = await table(2000)
    const { first, last } = host.virtualize.window
    expect(first).toBe(0)
    expect(last).toBeGreaterThan(0)
    expect(last).toBeLessThan(2000)
    expect(part(host, 'table')?.getAttribute('aria-rowcount')).toBe('2001')
    expect(part(host, 'head')?.getAttribute('aria-rowindex')).toBe('1')
    expect(rowIndex(host.querySelector('[value="r0"]'))).toBe('2')
    // The room of the rows not drawn stands after the window.
    expect((part(host, 'after') as HTMLElement).style.blockSize).toBe(
      `${host.virtualize.window.after}px`,
    )
  })

  test('moves the window with the scroll, and numbers the rows it draws by their place', async () => {
    const host = await table(2000)
    const box = part(host, 'table') as HTMLElement
    Object.defineProperty(box, 'clientHeight', { configurable: true, value: 400 })
    box.scrollTop = 40 * 1000
    box.dispatchEvent(new Event('scroll'))
    await settle(host)
    const { first } = host.virtualize.window
    expect(first).toBeGreaterThan(900)
    expect(rowIndex(host.querySelector(`[value="r${first}"]`))).toBe(String(first + 2))
  })

  test('reaches the last row with End and Control in a grid, and focuses its cell', async () => {
    const host = await table(2000, 'windowed grid')
    const first = host.querySelector('helix-headless-table-cell') as HTMLElement
    first.focus()
    first.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'End' }),
    )
    await settle(host)
    const active = document.activeElement as HTMLElement
    expect(active.parentElement?.getAttribute('value')).toBe('r1999')
    expect(host.virtualize.window.last).toBe(2000)
  })

  test('draws every row and says nothing more without `windowed`', async () => {
    const host = await table(30, '')
    expect(part(host, 'table')?.hasAttribute('aria-rowcount')).toBe(false)
    expect(part(host, 'before')).toBe(null)
    expect(rowIndex(host.querySelector('[value="r0"]'))).toBe(null)
  })
})
