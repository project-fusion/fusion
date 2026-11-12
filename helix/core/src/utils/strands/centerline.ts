import { catmull } from './path.js'

/*
 * The ribbon's centerline and one strand's place around it, as the web's
 * shader computes them in `strandAt`, for a drawing that lays its strands on
 * the CPU: a phone, whose GPU drawing has no vertex stage.
 *
 * **The same arithmetic, line for line in intent**, so a phone's ribbon takes
 * the web's form, width, roll, sway and squeeze. Each strand's random numbers
 * come from the same hash, which a GPU computes in single precision, so a
 * phone's strand of an id differs from the web's of that id while the ribbon
 * keeps the same spread of them.
 */

/** What a frame reads of the path and the element, all of it resolved. */
export interface CenterlineFrame {
  /** How many of the path's points are in use. */
  readonly count: number
  /** How much nearness shows, from `0`, flat, to `1`. */
  readonly depth: number
  /** How differently each strand moves, from `0`, as one, to `1`. */
  readonly drift: number
  /** How far along the path each point is, in CSS pixels. */
  readonly lengths: ArrayLike<number>
  /** The path, four numbers a point, as `path.ts` lays it. */
  readonly points: ArrayLike<number>
  /** The stretch of the path drawn, as a range of its parameter. */
  readonly range: readonly [number, number]
  /** How far the page is scrolled, in CSS pixels, or `0` inside a box. */
  readonly scroll: number
  /** The ribbon's width, `SPREAD` times the element's `spread`. */
  readonly spread: number
  /** Seconds of motion so far. */
  readonly time: number
  /** The box drawn into, in CSS pixels. */
  readonly view: readonly [number, number]
}

/** One place on the centerline, and what every strand reads there. */
export interface Station {
  /** How far along the path, in CSS pixels. */
  readonly along: number
  /** The ribbon's breadth here, in CSS pixels. */
  readonly breadth: number
  /** The path's brightness here, from `0`. */
  readonly bright: number
  /** The turn's curvature toward the normal. */
  readonly curve: number
  /** The normal, across the ribbon. */
  readonly nx: number
  readonly ny: number
  /** The centerline, in CSS pixels on screen. */
  readonly px: number
  readonly py: number
  /** The whole ribbon's sideways sway, in CSS pixels. */
  readonly sway: number
  /** The ribbon's width here, as a share of the box's width. */
  readonly width: number
}

/** The shader's hash: a fraction from any number, the same for the same number. */
export const hash = (n: number): number => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

export const mixed = (from: number, to: number, share: number): number => from + (to - from) * share

export const smooth = (from: number, to: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** One coordinate of the spline at `t`, over the point list read through `at`. */
const splineOf = (count: number, at: (i: number) => number, t: number): number => {
  const s = Math.min(1, Math.max(0, t)) * (count - 1)
  const i = Math.min(Math.floor(s), count - 2)
  return catmull(at(i - 1), at(i), at(i + 1), at(i + 2), s - i)
}

/** Reads the spline and the arc length of one frame's path. */
export const centerline = (frame: CenterlineFrame) => {
  const { count, lengths, points, scroll, view } = frame
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i))
  const coordinate = (c: number) => (i: number) => points[clamp(i) * 4 + c] ?? 0
  const columns = [coordinate(0), coordinate(1), coordinate(2), coordinate(3)] as const
  const length = (i: number) => lengths[clamp(i)] ?? 0
  const spline = (t: number, c: 0 | 1 | 2 | 3) => splineOf(count, columns[c], t)
  const place = (t: number): readonly [number, number] => [
    spline(t, 0) * view[0],
    spline(t, 1) - scroll,
  ]
  return { lengthAt: (t: number) => splineOf(count, length, t), place, spline }
}

/** Reads one frame's path at `t`: the centerline and everything a strand reads there. */
export const stationAt = (
  frame: CenterlineFrame,
  line: ReturnType<typeof centerline>,
  t: number,
): Station => {
  const { spread, time, view } = frame
  const [px, py] = line.place(t)
  const [qx, qy] = line.place(t + 0.0004)
  let tx = qx - px
  let ty = qy - py
  const run = Math.hypot(tx, ty)
  if (run > 1e-4) {
    tx /= run
    ty /= run
  } else {
    tx = 0
    ty = 1
  }
  const nx = -ty
  const ny = tx
  const along = line.lengthAt(t)
  const width = line.spline(t, 2) * spread
  const breadth = width * view[0] * (1 + 0.25 * Math.sin(time * 0.4 + along * 0.0045))
  const sway = Math.sin(along * 0.006 + time * 0.23) * mixed(6, 30, smooth(0.02, 0.2, width))
  const reach = 0.5 / Math.max(frame.count - 1, 1)
  const [bx, by] = line.place(t - reach)
  const [ax, ay] = line.place(t + reach)
  const vx = (ax - bx) * 0.5
  const vy = (ay - by) * 0.5
  const curve =
    ((ax - 2 * px + bx) * nx + (ay - 2 * py + by) * ny) / Math.max(vx * vx + vy * vy, 1e-2)
  return {
    along,
    breadth,
    bright: Math.max(line.spline(t, 3), 0),
    curve,
    nx,
    ny,
    px,
    py,
    sway,
    width,
  }
}

/** One strand's own numbers, from its id, as the shader hashes them. */
export interface StrandSeed {
  /** Its lane across the ribbon, from about `-1` to `1`. */
  readonly n: number
  readonly r5: number
  readonly r6: number
  readonly r7: number
  /** The sheet's thin second coordinate. */
  readonly z: number
}

export const seedOf = (id: number): StrandSeed => ({
  n: (hash(id + 0.13) + hash(id + 1.71) + hash(id + 3.37)) / 1.5 - 1,
  r5: hash(id + 7.77),
  r6: hash(id + 9.19),
  r7: hash(id + 11.3),
  z: (hash(id + 5.93) - 0.5) * 2 * 0.3,
})

/**
 * Where one strand stands at a station, in CSS pixels on screen, and its
 * depth, from `-1` at the back of the ribbon to `1` at the front: the shader's
 * laminar lanes, the roll, the soft limit, the wave, and the squeeze on the
 * inside of a turn, whose reasons `shader.ts` gives.
 */
export const strandAt = (
  frame: CenterlineFrame,
  station: Station,
  seed: StrandSeed,
): readonly [x: number, y: number, depth: number] => {
  const { depth: nearness, drift, time } = frame
  const { along, breadth } = station
  const { n, z } = seed
  const pace = 1 + drift * 0.25 * n
  const th = along * 0.002 + time * 0.25 * pace + drift * 0.6 * n
  const ct = Math.cos(th)
  const st = Math.sin(th)
  const depth = Math.min(1, Math.max(-1, z * 0.55 * ct - n * st))
  const limit = breadth * 1.3 + 1
  const across = breadth * (n * ct + z * 0.55 * st) * (1 + nearness * 0.35 * depth)
  let lat = station.sway + limit * Math.tanh(across / limit)
  lat += Math.sin(along * 0.0045 + time * 0.5 * pace + drift * 1.2 * n) * 10 * (1 + drift * 0.5)
  const excess = station.curve * lat - 0.6
  const squeeze = 0.5 * (excess + Math.sqrt(excess * excess + 0.01))
  lat /= 1 + squeeze
  return [station.px + station.nx * lat, station.py + station.ny * lat, depth]
}
