import { describe, expect, test } from 'bun:test'
import {
  type Axis,
  arranged,
  cycle,
  type DataRow,
  filter,
  format,
  ordered,
  parse,
  sort,
  window_,
} from './order.js'

/**
 * The pass, and mostly the one bug it exists to prevent.
 *
 * **The load-bearing test is `ordered` paging last.** Sorting the rendered
 * window is correct on the first screen and wrong on every other, so it survives
 * the way a fault is usually found, which is by looking at it once. Asserting
 * the composition rather than the three functions separately is what catches a
 * later edit that reorders them, and each one alone would still pass.
 */

const rows: DataRow[] = [
  { name: 'delta', owner: { name: 'Ada' }, size: 200 },
  { name: 'alpha', owner: { name: 'Grace' }, size: 30 },
  { name: 'charlie', owner: { name: 'Ada' }, size: 1000 },
  { name: 'bravo', owner: { name: 'Alan' }, size: 4 },
]

const axes: Axis[] = [
  { field: 'name', order: (row) => row.name },
  { field: 'size', order: (row) => row.size },
]

const names = (given: readonly DataRow[]) => given.map((row) => row.name)

describe('parse and format', () => {
  test('`field:direction` round-trips', () => {
    expect(format(parse('size:desc'))).toBe('size:desc')
  })

  test('a bare field is ascending, since that is what a query string carries', () => {
    expect(parse('size')).toEqual({ direction: 'asc', field: 'size' })
  })

  test('nonsense is no sort rather than an error, because this value comes from a URL', () => {
    for (const spec of ['', '   ', ':asc', 'size:sideways', 'size:']) {
      expect(parse(spec)).toBeUndefined()
    }
  })
})

describe('cycle', () => {
  test('a new column starts ascending', () => {
    expect(cycle(undefined, 'name')).toEqual({ direction: 'asc', field: 'name' })
    expect(cycle({ direction: 'desc', field: 'size' }, 'name')).toEqual({
      direction: 'asc',
      field: 'name',
    })
  })

  /**
   * The third state is reachable, and that is the point of testing it.
   *
   * The order rows arrived in is information the data came with, often a
   * server's own ranking. A two-state cycle makes it unreachable the moment a
   * reader sorts once, and nothing about the table would look broken.
   */
  test('the same column goes ascending, descending, then back to the order it arrived in', () => {
    const first = cycle(undefined, 'name')
    const second = cycle(first, 'name')
    expect(second).toEqual({ direction: 'desc', field: 'name' })
    expect(cycle(second, 'name')).toBeUndefined()
  })
})

describe('sort', () => {
  test('numbers compare as numbers', () => {
    expect(names(sort(rows, { direction: 'asc', field: 'size' }, axes))).toEqual([
      'bravo',
      'alpha',
      'delta',
      'charlie',
    ])
  })

  /**
   * `String(a) < String(b)` puts 1000 before 30 before 4, and the column looks
   * broken while every value in it is right.
   */
  test('a numeric column does not collate as text', () => {
    const sorted = sort(rows, { direction: 'asc', field: 'size' }, axes)
    expect(sorted[0]?.size).toBe(4)
    expect(sorted.at(-1)?.size).toBe(1000)
  })

  test('an unknown field leaves the order alone rather than emptying the table', () => {
    expect(names(sort(rows, { direction: 'asc', field: 'nope' }, axes))).toEqual(names(rows))
  })

  test('no sort leaves the order alone, and does not alias the input', () => {
    const out = sort(rows, undefined, axes)
    expect(out).toEqual(rows)
    expect(out).not.toBe(rows)
  })

  /**
   * Stability is what makes sorting by one column and then another leave the
   * first as the tiebreak, which is what a reader means by doing it.
   */
  test('equal values keep the order they arrived in, so a second sort tiebreaks by the first', () => {
    const tied: DataRow[] = [
      { group: 'b', name: 'first' },
      { group: 'a', name: 'second' },
      { group: 'a', name: 'third' },
      { group: 'a', name: 'fourth' },
    ]
    const byGroup: Axis[] = [{ field: 'group', order: (row) => row.group }]
    expect(names(sort(tied, { direction: 'asc', field: 'group' }, byGroup))).toEqual([
      'second',
      'third',
      'fourth',
      'first',
    ])
  })

  /**
   * Reversing the holes with the direction would put every missing value first
   * on a descending sort, which is the least useful screen the data can make.
   */
  test('missing values sort last in both directions', () => {
    const holes: DataRow[] = [
      { name: 'has', size: 5 },
      { name: 'null', size: null },
      { name: 'absent' },
      { name: 'empty', size: '' },
    ]
    const bySize: Axis[] = [{ field: 'size', order: (row) => row.size }]
    expect(names(sort(holes, { direction: 'asc', field: 'size' }, bySize))[0]).toBe('has')
    expect(names(sort(holes, { direction: 'desc', field: 'size' }, bySize))[0]).toBe('has')
  })

  test('dates compare as dates', () => {
    const dated: DataRow[] = [
      { at: new Date('2026-08-26'), name: 'later' },
      { at: new Date('2026-01-02'), name: 'earlier' },
    ]
    const byDate: Axis[] = [{ field: 'at', order: (row) => row.at }]
    expect(names(sort(dated, { direction: 'asc', field: 'at' }, byDate))).toEqual([
      'earlier',
      'later',
    ])
  })
})

describe('filter', () => {
  test('one query matches across every axis', () => {
    expect(names(filter(rows, 'alp', axes))).toEqual(['alpha'])
    expect(names(filter(rows, '1000', axes))).toEqual(['charlie'])
  })

  test('an empty query is every row, and does not alias the input', () => {
    const out = filter(rows, '   ', axes)
    expect(out).toHaveLength(4)
    expect(out).not.toBe(rows)
  })

  test('matching is case-insensitive', () => {
    expect(names(filter(rows, 'ALPHA', axes))).toEqual(['alpha'])
  })

  /** A search for "null" matching every hole in the data is a bad afternoon. */
  test('a hole matches nothing rather than the word for it', () => {
    const holes: DataRow[] = [
      { name: 'a', size: null },
      { name: 'b', size: undefined },
    ]
    const bySize: Axis[] = [{ field: 'size', order: (row) => row.size }]
    expect(filter(holes, 'null', bySize)).toHaveLength(0)
    expect(filter(holes, 'undefined', bySize)).toHaveLength(0)
  })

  test('only the declared axes are searched, so a hidden field is not secretly searchable', () => {
    expect(filter(rows, 'Grace', axes)).toHaveLength(0)
    expect(
      filter(rows, 'Grace', [
        ...axes,
        { field: 'owner.name', order: (row) => (row.owner as { name: string }).name },
      ]),
    ).toHaveLength(1)
  })
})

describe('window', () => {
  test('a page is a slice', () => {
    expect(names(window_(rows, 2, 2))).toEqual(['charlie', 'bravo'])
  })

  /** The usual way to be past the end is a bookmarked link after the result shrank. */
  test('a page past the end is the last page, not an empty table', () => {
    expect(names(window_(rows, 99, 2))).toEqual(['charlie', 'bravo'])
  })

  test('a size of zero is every row, which is what "no paging" means', () => {
    expect(window_(rows, 1, 0)).toHaveLength(4)
  })
})

describe('arranged', () => {
  /* What a windowing caller holds between renders. `ordered` is this plus one
     `window_`, and both are asserted because a caller now has the choice. */
  test('filters and sorts, and takes nothing off either end', () => {
    const result = arranged(rows, axes, { query: '', spec: 'name:asc' })
    expect(names(result.rows)).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
    expect(result.total).toBe(4)
  })

  test('sorts what the filter left, rather than filtering a sorted page', () => {
    const result = arranged(rows, axes, { query: 'a', spec: 'size:desc' })
    expect(names(result.rows)).toEqual(['charlie', 'delta', 'alpha', 'bravo'])
  })

  test('`total` counts before the filter, which is what says a filter is on', () => {
    const result = arranged(rows, axes, { query: 'alpha', spec: '' })
    expect(result.rows).toHaveLength(1)
    expect(result.total).toBe(4)
  })

  test('windowing it agrees with paging through `ordered`', () => {
    /* The property that lets a caller hold one and slice it: taking a page off
       an arrangement has to equal asking `ordered` for that page, or the two
       paths through this module disagree about what page two is. */
    const held = arranged(rows, axes, { query: '', spec: 'name:asc' })
    const page = ordered(rows, axes, { page: 2, query: '', size: 2, spec: 'name:asc' })
    expect(names(window_(held.rows, 2, 2))).toEqual(names(page.rows))
  })
})

describe('ordered', () => {
  /**
   * **The whole reason this module exists.** Paged first, page 1 of size 2 is
   * `delta, alpha` and sorting those gives `alpha, delta`. Filtered and sorted
   * first, the same page is `alpha, bravo`. The first is the bug, it is correct
   * on the first screen for an unsorted table, and it is what gets written when
   * the three operations are called in the order they read in.
   */
  test('the page is a slice of the sorted set, not the sort of a slice', () => {
    const result = ordered(rows, axes, { page: 1, query: '', size: 2, spec: 'name:asc' })
    expect(names(result.rows)).toEqual(['alpha', 'bravo'])
  })

  test('the count a pagination pages is the count after filtering', () => {
    const result = ordered(rows, axes, { page: 1, query: 'a', size: 2, spec: '' })
    expect(result.total).toBe(4)
    expect(result.matched).toBe(4)

    const narrower = ordered(rows, axes, { page: 1, query: 'alpha', size: 2, spec: '' })
    expect(narrower.total).toBe(4)
    expect(narrower.matched).toBe(1)
  })

  test('sorting applies to the whole set even when only one page is drawn', () => {
    const first = ordered(rows, axes, { page: 1, query: '', size: 1, spec: 'size:desc' })
    expect(first.rows[0]?.name).toBe('charlie')
    const last = ordered(rows, axes, { page: 4, query: '', size: 1, spec: 'size:desc' })
    expect(last.rows[0]?.name).toBe('bravo')
  })

  test('filtering applies to the whole set, so page 2 of a filtered result is right', () => {
    const result = ordered(rows, axes, { page: 2, query: 'a', size: 2, spec: 'name:asc' })
    expect(names(result.rows)).toEqual(['charlie', 'delta'])
  })
})
