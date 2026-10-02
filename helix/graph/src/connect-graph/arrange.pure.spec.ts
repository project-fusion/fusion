import { describe, expect, test } from 'bun:test'
import { arrangeByGroup } from './arrange.js'
import type { GraphPoint } from './seed.js'

/* Two groups, each a hub with notes hanging from it. */
const nodes = ['a', 'b'].flatMap((group) => [
  { group, id: `${group}-hub` },
  ...Array.from({ length: 30 }, (_, at) => ({ group, id: `${group}-${at}` })),
])
const links = ['a', 'b'].flatMap((group) =>
  Array.from({ length: 30 }, (_, at) => ({ source: `${group}-${at}`, target: `${group}-hub` })),
)

const distance = (one: GraphPoint | undefined, other: GraphPoint | undefined): number =>
  Math.hypot((one?.x ?? 0) - (other?.x ?? 0), (one?.y ?? 0) - (other?.y ?? 0))

describe('arrangeByGroup', () => {
  test('places every note', () => {
    expect(arrangeByGroup(nodes, links).size).toBe(62)
  })

  test('puts each note nearer its own hub than the other group’s', () => {
    const placed = arrangeByGroup(nodes, links)
    for (const group of ['a', 'b']) {
      const other = group === 'a' ? 'b' : 'a'
      for (let at = 0; at < 30; at++) {
        const note = placed.get(`${group}-${at}`)
        expect(distance(note, placed.get(`${group}-hub`))).toBeLessThan(
          distance(note, placed.get(`${other}-hub`)),
        )
      }
    }
  })

  test('puts the same graph in the same places on every load', () => {
    expect([...arrangeByGroup(nodes, links)]).toEqual([...arrangeByGroup(nodes, links)])
  })
})

describe('arrangeByGroup in three dimensions', () => {
  test('gives every note a depth, and keeps each note nearer its own hub', () => {
    const placed = arrangeByGroup(nodes, links, { solid: true })
    expect([...placed.values()].every((at) => Number.isFinite(at.z))).toBe(true)
    for (let at = 0; at < 30; at++) {
      const note = placed.get(`a-${at}`)
      const own = placed.get('a-hub')
      const other = placed.get('b-hub')
      const far = (one: typeof note, two: typeof note): number =>
        Math.hypot(
          (one?.x ?? 0) - (two?.x ?? 0),
          (one?.y ?? 0) - (two?.y ?? 0),
          (one?.z ?? 0) - (two?.z ?? 0),
        )
      expect(far(note, own)).toBeLessThan(far(note, other))
    }
  })
})
