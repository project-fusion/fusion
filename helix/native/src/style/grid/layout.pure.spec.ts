import { describe, expect, test } from 'bun:test'
import { type Input, type Item, layout, lengthOf, placementOf, trackList } from './layout.js'

const basis = { em: 16, rem: 16 }

/** A grid of `columns` at `width`, with `items` and no gaps unless given. */
const grid = (
  columns: string,
  width: number,
  items: readonly Item[],
  more: Partial<Input> = {},
): ReturnType<typeof layout> => {
  const list = trackList(columns)
  if (list === undefined) {
    throw new Error(`${columns} is no track list`)
  }
  return layout({ basis, columnGap: 0, columns: list, items, rowGap: 0, width, ...more })
}

/** Each cell as `row:column x width`, which reads at a glance. */
const frames = (laid: ReturnType<typeof layout>) =>
  laid.cells.map((cell) => `${cell.row}:${cell.column} ${cell.x} ${cell.width}`)

const many = (count: number, item: Item = {}): Item[] => Array.from({ length: count }, () => item)

describe('lengthOf', () => {
  test('reads points, rems, ems, and a share of the width', () => {
    expect(lengthOf('12px', basis, 400)).toBe(12)
    expect(lengthOf('2rem', { em: 10, rem: 20 }, 400)).toBe(40)
    expect(lengthOf('1.5em', { em: 10, rem: 20 }, 400)).toBe(15)
    expect(lengthOf('25%', basis, 400)).toBe(100)
    expect(lengthOf('0', basis, 400)).toBe(0)
  })

  test('works out calc(), min(), max(), and clamp() over them', () => {
    expect(lengthOf('min(16rem, 100%)', basis, 200)).toBe(200)
    expect(lengthOf('min(16rem, 100%)', basis, 400)).toBe(256)
    expect(lengthOf('calc(100% - 2rem)', basis, 400)).toBe(368)
    expect(lengthOf('calc((10rem - 100%) * 2)', basis, 100)).toBe(120)
    expect(lengthOf('max(10px, 5%)', basis, 400)).toBe(20)
    expect(lengthOf('clamp(10rem, 50%, 20rem)', basis, 1000)).toBe(320)
  })

  test('is nothing where a phone cannot work it out', () => {
    expect(lengthOf('var(--rail)', basis, 400)).toBeUndefined()
    expect(lengthOf('10vw', basis, 400)).toBeUndefined()
    expect(lengthOf('calc(1rem', basis, 400)).toBeUndefined()
    expect(lengthOf('1rem 2rem', basis, 400)).toBeUndefined()
  })
})

describe('trackList', () => {
  test('spells out a repeat of a count, and reads minmax and auto', () => {
    expect(trackList('repeat(3, minmax(0, 1fr))')?.before).toHaveLength(3)
    expect(trackList('auto minmax(0, 1fr)')?.before).toEqual([
      { max: { kind: 'auto' }, min: { kind: 'auto' } },
      { max: { kind: 'fr', share: 1 }, min: { kind: 'length', length: '0' } },
    ])
  })

  test('holds a repeat that fills the width apart', () => {
    const list = trackList('7rem repeat(auto-fit, minmax(min(16rem, 100%), 1fr))')
    expect(list?.before).toHaveLength(1)
    expect(list?.repeat?.fit).toBe(true)
    expect(list?.repeat?.tracks).toEqual([
      { max: { kind: 'fr', share: 1 }, min: { kind: 'length', length: 'min(16rem, 100%)' } },
    ])
  })

  test('is nothing for none, a subgrid, or what it cannot read', () => {
    expect(trackList('none')).toBeUndefined()
    expect(trackList('subgrid')).toBeUndefined()
    expect(trackList('repeat(2, minmax(0, 1fr)')).toBeUndefined()
    expect(trackList('[rail] 7rem [main] 1fr')?.before).toHaveLength(2)
  })
})

describe('placementOf', () => {
  test('reads a line, a span, and both', () => {
    expect(placementOf('span 2')).toEqual({ span: 2 })
    expect(placementOf('1 / -1')).toEqual({ end: -1, start: 1 })
    expect(placementOf('2 / span 3')).toEqual({ span: 3, start: 2 })
    expect(placementOf('3')).toEqual({ start: 3 })
    expect(placementOf('auto')).toEqual({})
    expect(placementOf('main')).toEqual({})
  })
})

describe('layout', () => {
  test('shares the width among equal columns, gaps between them', () => {
    const laid = grid('repeat(3, minmax(0, 1fr))', 320, many(5), { columnGap: 10 })
    expect(laid.columns).toEqual([100, 100, 100])
    expect(frames(laid)).toEqual([
      '0:0 0 100',
      '0:1 110 100',
      '0:2 220 100',
      '1:0 0 100',
      '1:1 110 100',
    ])
  })

  test('sizes lengths, then gives the rest to shares in fr', () => {
    const laid = grid('7rem minmax(0, 32rem)', 600, many(2), { columnGap: 24 })
    expect(laid.columns).toEqual([112, 464])
    const wide = grid('7rem minmax(0, 32rem)', 1200, many(2), { columnGap: 24 })
    expect(wide.columns).toEqual([112, 512])
    expect(grid('100px 2fr 1fr', 400, many(3)).columns).toEqual([100, 200, 100])
  })

  test('keeps a share in fr no narrower than its least', () => {
    expect(grid('minmax(150px, 1fr) 3fr', 400, many(2)).columns).toEqual([150, 250])
  })

  test('fits as many columns of a least width as the width holds, with auto-fit', () => {
    const min = 'repeat(auto-fit, minmax(min(16rem, 100%), 1fr))'
    expect(grid(min, 1000, many(6), { columnGap: 16 }).columns).toEqual([
      322.6666666666667, 322.6666666666667, 322.6666666666667,
    ])
    expect(frames(grid(min, 390, many(3), { columnGap: 16 }))).toEqual([
      '0:0 0 390',
      '1:0 0 390',
      '2:0 0 390',
    ])
  })

  test('collapses the auto-fit columns no cell reaches, and auto-fill keeps them', () => {
    const fit = grid('repeat(auto-fit, minmax(100px, 1fr))', 500, many(2), { columnGap: 10 })
    expect(frames(fit)).toEqual(['0:0 0 245', '0:1 255 245'])
    const fill = grid('repeat(auto-fill, minmax(100px, 1fr))', 500, many(2), { columnGap: 10 })
    expect(fill.columns).toHaveLength(4)
    expect(frames(fill)).toEqual(['0:0 0 117.5', '0:1 127.5 117.5'])
  })

  test('spans columns, and a span that does not fit starts the next row, leaving a hole', () => {
    const laid = grid(
      'repeat(3, minmax(0, 1fr))',
      300,
      [{ column: { span: 2 } }, { column: { span: 2 } }, {}],
      { columnGap: 0 },
    )
    expect(frames(laid)).toEqual(['0:0 0 200', '1:0 0 200', '1:2 200 100'])
  })

  test('places a cell set from the first line to the last across the row, after the others', () => {
    const full = { column: placementOf('1 / -1') }
    const laid = grid('repeat(3, minmax(0, 1fr))', 300, [
      full,
      { column: { span: 2 } },
      {},
      {},
      full,
      {},
    ])
    expect(frames(laid)).toEqual([
      '0:0 0 300',
      '1:0 0 200',
      '1:2 200 100',
      '2:0 0 100',
      '3:0 0 300',
      '4:0 0 100',
    ])
  })

  test('adds a column of no width for a span wider than the grid', () => {
    const laid = grid('repeat(2, minmax(0, 1fr))', 200, [{ column: { span: 3 } }, {}])
    expect(laid.columns).toEqual([100, 100, 0])
    expect(frames(laid)).toEqual(['0:0 0 200', '1:0 0 100'])
  })

  test('sizes a column by its content, measured, and asks for what it has not measured', () => {
    const first = grid('auto 1fr', 400, [{}, {}])
    expect(first.measures).toEqual([0])
    const laid = grid('auto 1fr', 400, [{ width: 90 }, {}, { width: 120 }, {}], { columnGap: 8 })
    expect(laid.measures).toEqual([])
    expect(laid.columns).toEqual([120, 272])
  })

  test('shares what is left among columns sized by their content where nothing else takes it', () => {
    expect(grid('auto auto', 400, [{ width: 100 }, { width: 50 }]).columns).toEqual([225, 175])
  })

  test('places a cell set on its row there, and the rest around it', () => {
    const laid = grid('repeat(2, 1fr)', 200, [{}, { column: { start: 2 }, row: { start: 1 } }, {}])
    expect(frames(laid)).toEqual(['0:0 0 100', '0:1 100 100', '1:0 0 100'])
  })

  test('gives a row its height where a length sets it, and its content elsewhere', () => {
    const rows = trackList('3rem auto minmax(0, 1fr)')
    const laid = grid('1fr', 100, many(4), { ...(rows === undefined ? {} : { rows }) })
    expect(laid.rows).toEqual([{ height: 48 }, {}, {}, {}])
  })

  test('gives a row its least where `minmax()` sets one, and its greatest where a length sets that', () => {
    const rows = trackList(
      'minmax(30rem, auto) minmax(4rem, 8rem) minmax(auto, 8rem) minmax(2rem, 1fr)',
    )
    const laid = grid('1fr', 100, many(4), { ...(rows === undefined ? {} : { rows }) })
    expect(laid.rows).toEqual([{ least: 480 }, { height: 128 }, { least: 128 }, { least: 32 }])
  })

  test('repeats a row track with `minmax()` for each row', () => {
    const rows = trackList('repeat(3, minmax(30rem, auto))')
    const laid = grid('minmax(0, 1fr)', 100, many(3), { ...(rows === undefined ? {} : { rows }) })
    expect(laid.rows).toEqual([{ least: 480 }, { least: 480 }, { least: 480 }])
  })
})
