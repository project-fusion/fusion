import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const row = async (): Promise<HTMLElement> =>
  (await mount(
    '<helix-headless-table-row><helix-headless-table-cell>solid</helix-headless-table-cell></helix-headless-table-row>',
  )) as HTMLElement

/**
 * One row, and the contract that is the row's rather than the table's.
 *
 * **The table already proves the layout**, which is the row's cells becoming
 * items of the table's own grid so every column lines up. What the row owns
 * alone is the thing that layout takes away. `display: contents` removes the
 * row's box, and a spec that reads the grid cannot tell a table with rows from
 * a table with only cells, because they lay out identically. That is the whole
 * failure this asserts against: a table with cells and no rows is broken rather
 * than plain.
 */
describe('one table row', () => {
  test('is still a row after its box is gone', async () => {
    expect(role(await row())).toBe('row')
  })

  /* On the host, because that is where the flat tree puts it between the table
     and the cells. Inside the shadow root it would be a row containing the
     cells' *slot* rather than the cells. */
  test('carries the role where the structure needs it, not inside its own root', async () => {
    const host = await row()
    expect(host.shadowRoot?.querySelector('[role]')).toBeNull()
    expect(host.shadowRoot?.querySelector('slot')).not.toBeNull()
  })
})

describe('a row with href', () => {
  /* Each followed link is a click on an anchor the row adds for the moment,
     heard here and stopped, so nothing navigates. */
  const followed: string[] = []
  const hear = (event: Event): void => {
    const anchor = event.target
    if (anchor instanceof HTMLAnchorElement && anchor.hidden) {
      followed.push(anchor.getAttribute('href') ?? '')
      event.preventDefault()
    }
  }
  afterEach(() => {
    document.removeEventListener('click', hear, true)
    followed.length = 0
  })

  const linked = async (): Promise<HTMLElement & { updateComplete: Promise<unknown> }> => {
    document.addEventListener('click', hear, true)
    const host = (await mount(
      '<helix-headless-table-row href="/runs/7"><helix-headless-table-cell>Run 7</helix-headless-table-cell><helix-headless-table-cell><button>Retry</button></helix-headless-table-cell></helix-headless-table-row>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    return host
  }

  test('follows its link from a press on any cell, and says it is a link', async () => {
    const host = await linked()
    expect(hasState(host, 'link')).toBe(true)
    ;(host.querySelector('helix-headless-table-cell') as HTMLElement).click()
    expect(followed).toEqual(['/runs/7'])
  })

  test('leaves a press on a control of its own to that control', async () => {
    const host = await linked()
    ;(host.querySelector('button') as HTMLElement).click()
    expect(followed).toEqual([])
  })

  test('without href is no link, and a press follows nothing', async () => {
    document.addEventListener('click', hear, true)
    const host = await row()
    host.click()
    expect(hasState(host, 'link')).toBe(false)
    expect(followed).toEqual([])
  })
})
