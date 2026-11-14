import { describe, expect, test } from 'bun:test'
import { entryOf, headOf, itemsIn, sectionAt, sectionsOf } from './sections.js'

const items = [
  { team: 'Design' },
  { team: 'Design' },
  { team: 'Engineering' },
  { team: 'Engineering' },
  { team: 'Engineering' },
  { team: 'Sales' },
]
const sections = sectionsOf(items, 'team')

describe('sections', () => {
  test('start wherever the field changes', () => {
    expect(sections).toEqual({ names: ['Design', 'Engineering', 'Sales'], starts: [0, 2, 5] })
  })

  test('number each header before its items', () => {
    // Design header 0, items 1 and 2; Engineering header 3, items 4 to 6; Sales header 7, item 8.
    expect([0, 1, 2, 5].map((item) => entryOf(sections, item))).toEqual([1, 2, 4, 8])
    expect([0, 1, 2].map((section) => headOf(sections, section))).toEqual([0, 3, 7])
    expect(sectionAt(sections, 4)).toBe(1)
  })

  test('read a span of entries as the items in it', () => {
    expect(itemsIn(sections, { first: 0, last: 9 }, 6)).toEqual({ first: 0, last: 6 })
    // From the Engineering header to before the Sales header.
    expect(itemsIn(sections, { first: 3, last: 7 }, 6)).toEqual({ first: 2, last: 5 })
    expect(itemsIn(sections, { first: 5, last: 6 }, 6)).toEqual({ first: 3, last: 4 })
  })
})
