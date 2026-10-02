import type { GraphPoint } from './seed.js'

/**
 * Places on a surface, joined to their near neighbors, and split in halves
 * by how far apart they are across the surface, not through the air.
 *
 * **Half a surface measured across it is one piece of it**: a stretch of a
 * knot's tube, or one lobe of a brain. Half of it by position can be its
 * front and its back, and half of it by direction from its middle can be
 * three passes of a tube that crosses itself.
 */
export const surfaceWeb = (points: readonly GraphPoint[]) => {
  const count = points.length
  const x = (at: number): number => (points[at] as GraphPoint).x
  const y = (at: number): number => (points[at] as GraphPoint).y
  const z = (at: number): number => (points[at] as GraphPoint).z ?? 0
  const far = (one: number, other: number): number =>
    Math.hypot(x(one) - x(other), y(one) - y(other), z(one) - z(other))

  /* How far apart neighboring places are: the middle of a sample's nearest
     distances, which the places' even spread makes a fair measure of all. */
  const sample = Math.min(count, 256)
  const nearest: number[] = []
  for (let step = 0; step < sample; step++) {
    const one = Math.floor((step * count) / sample)
    let best = Number.POSITIVE_INFINITY
    for (let other = 0; other < count; other++) {
      if (other !== one) {
        best = Math.min(best, far(one, other))
      }
    }
    if (Number.isFinite(best)) {
      nearest.push(best)
    }
  }
  nearest.sort((one, other) => one - other)
  const reach = (nearest[Math.floor(nearest.length / 2)] ?? 1) * 2.2

  /* Neighbors within reach, found through a grid of cells as wide as it. */
  const cells = new Map<string, number[]>()
  const cellOf = (at: number): [number, number, number] => [
    Math.floor(x(at) / reach),
    Math.floor(y(at) / reach),
    Math.floor(z(at) / reach),
  ]
  for (let at = 0; at < count; at++) {
    const key = cellOf(at).join(',')
    const list = cells.get(key)
    if (list) {
      list.push(at)
    } else {
      cells.set(key, [at])
    }
  }
  const neighbors: number[][] = Array.from({ length: count }, () => [])
  for (let at = 0; at < count; at++) {
    const [cx, cy, cz] = cellOf(at)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const other of cells.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            if (other > at && far(at, other) <= reach) {
              ;(neighbors[at] as number[]).push(other)
              ;(neighbors[other] as number[]).push(at)
            }
          }
        }
      }
    }
  }

  /* Steps across the web from one place to every other in a set, in buffers
     kept between calls: which set a place is in now, and its steps. */
  const member = new Int32Array(count).fill(-1)
  let round = 0
  const steps = (from: number, out: Int32Array): number => {
    out.fill(-1)
    const queue = [from]
    out[from] = 0
    let last = from
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head] as number
      last = at
      for (const next of neighbors[at] as number[]) {
        if (member[next] === round && out[next] === -1) {
          out[next] = (out[at] as number) + 1
          queue.push(next)
        }
      }
    }
    return last
  }
  const fromA = new Int32Array(count)
  const fromB = new Int32Array(count)

  return {
    /**
     * A set of places in two halves, `first` as many as the first: the
     * places nearer one end of the set, across the surface, and the rest.
     * The ends are two places about as far apart across it as any.
     */
    halve: (places: readonly number[], first: number): [number[], number[]] => {
      round += 1
      for (const at of places) {
        member[at] = round
      }
      const a = steps(places[0] as number, fromA)
      const b = steps(a, fromA)
      steps(b, fromB)
      /* A place the web does not reach from either end, as on a piece of the
         surface apart from the rest, is ordered by where it is instead. */
      const unreached = places.length * 4
      const key = (at: number): number => {
        const one = fromA[at] as number
        const other = fromB[at] as number
        if (one < 0 || other < 0) {
          return unreached + far(at, a) - far(at, b)
        }
        return one - other
      }
      const ordered = [...places].sort((one, other) => key(one) - key(other))
      return [ordered.slice(0, first), ordered.slice(first)]
    },
  }
}
