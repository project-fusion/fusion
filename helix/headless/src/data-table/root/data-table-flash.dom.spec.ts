import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * `flash-changes`: which rows light up when `rows` is set again. Whether the
 * wash looks right is a browser's to say; this holds which rows take one.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends Updatable {
  rows: readonly Record<string, unknown>[]
}

/** The names of the rows each wash was drawn on, in the order they were asked. */
let lit: string[] = []
let washes: Keyframe[][] = []
const realAnimate = HTMLElement.prototype.animate

beforeEach(() => {
  lit = []
  washes = []
  HTMLElement.prototype.animate = function (
    this: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  ): Animation {
    const frames = (keyframes ?? []) as Keyframe[]
    if (frames.some((one) => String(one.boxShadow ?? '').includes('inset'))) {
      const row = this.closest('[part~="row"]') ?? this
      lit.push(row.querySelector('[part~="cell"]')?.textContent?.trim() ?? '')
      washes.push(frames)
    }
    const animation = new EventTarget()
    return Object.assign(animation, { cancel: () => undefined, currentTime: 0 }) as Animation
  } as HTMLElement['animate']
})

afterEach(() => {
  HTMLElement.prototype.animate = realAnimate
})

const ROWS = [
  { id: 'a', name: 'alpha', size: 30 },
  { id: 'b', name: 'bravo', size: 4 },
  { id: 'c', name: 'charlie', size: 1000 },
]

const table = async (attrs = 'flash-changes row-key="id"'): Promise<Table> => {
  const element = (await mount(`<helix-headless-data-table ${attrs}>
    <helix-headless-table-column field="name">Name</helix-headless-table-column>
    <helix-headless-table-column field="size">Size</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = ROWS
  await settle(element)
  return element
}

describe('flash-changes', () => {
  test('lights nothing as the table first draws its rows', async () => {
    await table()
    expect(lit).toEqual([])
  })

  test('lights a row whose values change, and not a row fetched again with the same values', async () => {
    const element = await table()
    element.rows = ROWS.map((row) => (row.id === 'b' ? { ...row, size: 5 } : { ...row }))
    await settle(element)
    expect(lit).toEqual(['bravo'])
  })

  test('lights a row that arrives, wherever it lands', async () => {
    const element = await table()
    element.rows = [{ id: 'd', name: 'delta', size: 2 }, ...ROWS]
    await settle(element)
    expect(lit).toEqual(['delta'])
  })

  test('lights no row that answers a reader asking for more, and still lights one that changed', async () => {
    const element = await table('flash-changes load-more row-key="id"')
    const more = (element as unknown as HTMLElement).shadowRoot?.querySelector(
      '[part="more-button"]',
    ) as HTMLElement
    more.click()
    element.rows = [{ ...ROWS[0], size: 31 }, ...ROWS.slice(1), { id: 'd', name: 'delta', size: 2 }]
    await settle(element)
    expect(lit).toEqual(['alpha'])
  })

  test('lights nothing for rows that share no key with the ones before', async () => {
    const element = await table()
    element.rows = [
      { id: 'x', name: 'xray', size: 1 },
      { id: 'y', name: 'yankee', size: 2 },
    ]
    await settle(element)
    expect(lit).toEqual([])
  })

  test('lights nothing without the attribute, or without a row key', async () => {
    const off = await table('row-key="id"')
    off.rows = ROWS.map((row) => ({ ...row, size: 0 }))
    await settle(off)
    const unkeyed = await table('flash-changes')
    unkeyed.rows = ROWS.map((row) => ({ ...row, size: 0 }))
    await settle(unkeyed)
    expect(lit).toEqual([])
  })

  test('lights nothing for a value a reader saves in a cell', async () => {
    const element = (await mount(`<helix-headless-data-table flash-changes row-key="id">
      <helix-headless-table-column editable field="name">Name</helix-headless-table-column>
    </helix-headless-data-table>`)) as Table & {
      commitEdit: () => Promise<boolean>
      editCell: (row: Record<string, unknown>, field: string, typed?: string) => boolean
    }
    element.rows = ROWS
    await settle(element)
    element.editCell(element.rows[0] as Record<string, unknown>, 'name', 'alpine')
    await settle(element)
    expect(await element.commitEdit()).toBe(true)
    await settle(element)
    expect(element.rows[0]?.name).toBe('alpine')
    expect(lit).toEqual([])
  })

  test('takes its wash from --data-table-flash-color', async () => {
    const element = await table()
    ;(element as unknown as HTMLElement).style.setProperty(
      '--data-table-flash-color',
      'rgb(1 2 3 / 0.2)',
    )
    element.rows = ROWS.map((row) => (row.id === 'a' ? { ...row, size: 31 } : row))
    await settle(element)
    expect(String(washes[0]?.[0]?.boxShadow)).toContain('rgb(1 2 3 / 0.2)')
  })
})
