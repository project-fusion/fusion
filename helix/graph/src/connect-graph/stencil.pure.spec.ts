import { describe, expect, test } from 'bun:test'
import { fieldFromInside } from '../shapes/shape-field.js'
import { arrangeByGroup, hubsOf } from './arrange.js'
import type { GraphPoint } from './seed.js'
import { fitInStencil, fitToStencil, type GraphStencil } from './stencil.js'

/** A square of notes from 0 to 100 each way, `side` to a row. */
const square = (side: number, prefix = 'n'): Map<string, GraphPoint> => {
  const notes = new Map<string, GraphPoint>()
  for (let row = 0; row < side; row++) {
    for (let column = 0; column < side; column++) {
      notes.set(`${prefix}${row}-${column}`, {
        x: (column / (side - 1)) * 100,
        y: (row / (side - 1)) * 100,
      })
    }
  }
  return notes
}

/* A disc in a box 100 by 100 with a square hole in the middle. The notes
   above fill the same box, so a fitted place reads straight back into the
   stencil's: the same x, and y turned over, since the stencil's points down. */
const holed: GraphStencil = {
  height: 100,
  inside: (x, y) =>
    Math.hypot(x - 50, y - 50) < 50 && !(Math.abs(x - 50) < 10 && Math.abs(y - 50) < 10),
  width: 100,
}
const back = (at: GraphPoint): [number, number] => [at.x, 100 - at.y]

describe('fitToStencil', () => {
  test('puts every note inside the shape, each in a place of its own', () => {
    const fitted = fitToStencil(square(20), holed)
    expect(fitted.size).toBe(400)
    for (const at of fitted.values()) {
      expect(holed.inside(...back(at))).toBe(true)
    }
    expect(new Set([...fitted.values()].map((at) => `${at.x},${at.y}`)).size).toBe(400)
  })

  test('keeps notes the layout put together together', () => {
    const notes = new Map([
      ...[...square(10, 'left')].map(([id, at]) => [id, { x: at.x * 0.4, y: at.y }] as const),
      ...[...square(10, 'right')].map(([id, at]) => [id, { x: 60 + at.x * 0.4, y: at.y }] as const),
    ])
    const fitted = fitToStencil(notes, holed)
    const leftOf = (prefix: string): number =>
      [...fitted].filter(([id]) => id.startsWith(prefix)).filter(([, at]) => at.x < 50).length
    expect(leftOf('left')).toBeGreaterThan(85)
    expect(leftOf('right')).toBeLessThan(15)
  })

  test('puts the same notes in the same places on every load', () => {
    expect([...fitToStencil(square(12), holed)]).toEqual([...fitToStencil(square(12), holed)])
  })

  test('leaves the notes where they were when the shape has no inside', () => {
    const notes = square(4)
    expect(fitToStencil(notes, { height: 10, inside: () => false, width: 10 })).toEqual(notes)
  })
})

describe('fitToStencil in three dimensions', () => {
  /* Two groups of a hub and 199 notes each, arranged in three dimensions. */
  const nodes = ['a', 'b'].flatMap((group) => [
    { group, id: `${group}-hub` },
    ...Array.from({ length: 199 }, (_, at) => ({ group, id: `${group}-${at}` })),
  ])
  const links = ['a', 'b'].flatMap((group) =>
    Array.from({ length: 199 }, (_, at) => ({ source: `${group}-${at}`, target: `${group}-hub` })),
  )
  const ball = fieldFromInside((x, y, z) => Math.hypot(x - 50, y - 50, z - 50) < 45, {
    depth: 100,
    height: 100,
    width: 100,
  })
  const fitted = fitToStencil(arrangeByGroup(nodes, links, { solid: true }), {
    ...ball,
    place: 'surface',
  })
  const points = [...fitted.values()]
  const middle = {
    x: points.reduce((sum, at) => sum + at.x, 0) / points.length,
    y: points.reduce((sum, at) => sum + at.y, 0) / points.length,
    z: points.reduce((sum, at) => sum + (at.z ?? 0), 0) / points.length,
  }
  const out = (at: { x: number; y: number; z?: number | undefined }): number =>
    Math.hypot(at.x - middle.x, at.y - middle.y, (at.z ?? 0) - middle.z)

  test('puts every note on the surface: all about as far from the middle', () => {
    expect(fitted.size).toBe(400)
    const reach = points.map(out)
    expect(Math.min(...reach) / Math.max(...reach)).toBeGreaterThan(0.85)
  })

  test('puts each group on one side of the shape', () => {
    const side = (group: string) => {
      const mine = [...fitted].filter(([id]) => id.startsWith(`${group}-`)).map(([, at]) => at)
      const x = mine.reduce((sum, at) => sum + at.x - middle.x, 0)
      const y = mine.reduce((sum, at) => sum + at.y - middle.y, 0)
      const z = mine.reduce((sum, at) => sum + (at.z ?? 0) - middle.z, 0)
      const length = Math.hypot(x, y, z)
      return { x: x / length, y: y / length, z: z / length }
    }
    const a = side('a')
    const b = side('b')
    /* The two groups' middles point away from each other. */
    expect(a.x * b.x + a.y * b.y + a.z * b.z).toBeLessThan(-0.5)
  })
})

describe('fitInStencil by cluster', () => {
  /* Six groups of a hub and 99 notes each, on a ball's surface. */
  const groups = ['a', 'b', 'c', 'd', 'e', 'f']
  const nodes = groups.flatMap((group) => [
    { group, id: `${group}-hub` },
    ...Array.from({ length: 99 }, (_, at) => ({ group, id: `${group}-${at}` })),
  ])
  const links = groups.flatMap((group) =>
    Array.from({ length: 99 }, (_, at) => ({ source: `${group}-${at}`, target: `${group}-hub` })),
  )
  const ball = fieldFromInside((x, y, z) => Math.hypot(x - 50, y - 50, z - 50) < 45, {
    depth: 100,
    height: 100,
    width: 100,
  })
  const groupOf = new Map(nodes.map((node) => [node.id, node.group]))
  const { hubOf } = hubsOf(nodes, links)

  /** The share of notes nearer the middle of their own group than of any other. */
  const together = (fitted: Map<string, { x: number; y: number; z?: number | undefined }>) => {
    const middles = new Map<string, { x: number; y: number; z: number; count: number }>()
    for (const [id, at] of fitted) {
      const group = groupOf.get(id) as string
      const middle = middles.get(group) ?? { count: 0, x: 0, y: 0, z: 0 }
      middle.x += at.x
      middle.y += at.y
      middle.z += at.z ?? 0
      middle.count += 1
      middles.set(group, middle)
    }
    let own = 0
    for (const [id, at] of fitted) {
      let best = ''
      let nearest = Number.POSITIVE_INFINITY
      for (const [group, { count, x, y, z }] of middles) {
        const far = Math.hypot(at.x - x / count, at.y - y / count, (at.z ?? 0) - z / count)
        if (far < nearest) {
          nearest = far
          best = group
        }
      }
      own += best === groupOf.get(id) ? 1 : 0
    }
    return own / fitted.size
  }

  test('gives each group a piece of the surface of its own, where without clusters groups mix', () => {
    const { positions } = fitInStencil(
      arrangeByGroup(nodes, links, { solid: true }),
      { ...ball, place: 'surface' },
      { clustersOf: (id) => [groupOf.get(id) as string, hubOf(id)] },
    )
    const plain = fitInStencil(arrangeByGroup(nodes, links, { solid: true }), {
      ...ball,
      place: 'surface',
    }).positions
    expect(positions.size).toBe(600)
    /* Measured at 0.82 by cluster and 0.68 without, on 2 Oct 2026. */
    expect(together(positions)).toBeGreaterThan(0.75)
    expect(together(positions) - together(plain)).toBeGreaterThan(0.1)
  })
})

describe('fitInStencil with named regions', () => {
  /* A ball whose left half is the part `west` and right half `east`, and three groups. */
  const ball = {
    ...fieldFromInside((x, y, z) => Math.hypot(x - 50, y - 50, z - 50) < 45, {
      depth: 100,
      height: 100,
      width: 100,
    }),
    regionOf: (x: number) => (x < 50 ? 'west' : 'east'),
  }
  const groups = ['a', 'b', 'c']
  const nodes = groups.flatMap((group) => [
    { group, id: `${group}-hub` },
    ...Array.from({ length: 99 }, (_, at) => ({ group, id: `${group}-${at}` })),
  ])
  const links = groups.flatMap((group) =>
    Array.from({ length: 99 }, (_, at) => ({ source: `${group}-${at}`, target: `${group}-hub` })),
  )
  const groupOf = new Map(nodes.map((node) => [node.id, node.group]))
  const { hubOf } = hubsOf(nodes, links)
  const fit = (regions: Record<string, string>) =>
    fitInStencil(
      arrangeByGroup(nodes, links, { solid: true }),
      { ...ball, place: 'surface', regions },
      { clustersOf: (id) => [groupOf.get(id) as string, hubOf(id)] },
    )

  /** Which side of the ball's middle a group's notes are on: the share on the west. */
  const west = (positions: Map<string, { x: number }>, group: string): number => {
    const xs = [...positions].filter(([id]) => groupOf.get(id) === group).map(([, at]) => at.x)
    const all = [...positions.values()].map((at) => at.x)
    const middle = (Math.min(...all) + Math.max(...all)) / 2
    return xs.filter((x) => x < middle).length / xs.length
  }

  test('puts each mapped group in its own part of the shape', () => {
    const { positions } = fit({ a: 'west', b: 'east' })
    expect(positions.size).toBe(300)
    expect(west(positions, 'a')).toBe(1)
    expect(west(positions, 'b')).toBe(0)
  })

  test('puts a group no part is named for in the parts no group claims', () => {
    const { positions } = fit({ a: 'west' })
    expect(west(positions, 'a')).toBe(1)
    expect(west(positions, 'b')).toBe(0)
    expect(west(positions, 'c')).toBe(0)
  })

  test('treats a part the shape does not have as no part at all', () => {
    const { positions } = fit({ a: 'nowhere' })
    expect(positions.size).toBe(300)
  })

  test('places every note where every group is sent somewhere and one part is misspelled', () => {
    const { frame, positions } = fit({ a: 'west', b: 'east', c: 'esat' })
    expect(frame).toBeDefined()
    expect(positions.size).toBe(300)
    /* Most of the way, since the rest share the parts and the halves are measured by the notes' spread. */
    expect(west(positions, 'a')).toBeGreaterThan(0.9)
    for (const at of positions.values()) {
      expect(Number.isFinite(at.x) && Number.isFinite(at.y)).toBe(true)
    }
  })

  test('places every note where the shape has no named parts at all', () => {
    const { regionOf: _, ...plain } = ball
    const { frame, positions } = fitInStencil(
      arrangeByGroup(nodes, links, { solid: true }),
      { ...plain, place: 'surface', regions: { a: 'west', b: 'east', c: 'west' } },
      { clustersOf: (id) => [groupOf.get(id) as string, hubOf(id)] },
    )
    expect(frame).toBeDefined()
    expect(positions.size).toBe(300)
  })
})
