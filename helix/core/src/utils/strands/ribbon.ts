import {
  type CenterlineFrame,
  centerline,
  hash,
  mixed,
  type Station,
  type StrandSeed,
  seedOf,
  smooth,
  stationAt,
  strandAt,
} from './centerline.js'
import type { StrandsPalette } from './palette.js'

/**
 * The ribbon as triangles laid on the CPU, for a drawing with no vertex
 * stage: a phone's react-native-skia. The web's vertex shaders lay the same
 * strands and dust on its GPU.
 *
 * **Each strand is a strip across its width**, two vertices a station, as
 * the web's quads are, with the light's profile across it carried in each
 * vertex's texture coordinates: how many of its spreads the vertex stands
 * from its middle, and the light it carries there. A drawing turns them into
 * the web's Gaussian, so a strand is as soft and as bright as the web's.
 *
 * **The strands fall into four colors**, as the shader picks them: the glow,
 * the tint for a few, and the peak over either for the hottest. Each color
 * is one strip of all its strands, joined by triangles of no area.
 */

/** The most strands a ribbon draws, at `density` 1. */
export const MAX_STRANDS = 340

/** The fewest, at `density` 0. Fewer stops reading as a ribbon at all. */
export const MIN_STRANDS = 60

/** Specks of dust around the strands at a `dust` of `1`. */
export const DUST = 600

/** The most specks a frame draws, at a `dust` of `4`. */
export const MAX_DUST = DUST * 4

/** What one frame needs beyond the centerline, all of it resolved. */
export interface RibbonFrame extends CenterlineFrame {
  /** How far apart the brightest and dimmest strands are, from `0` to `1`. */
  readonly contrast: number
  /** The drawing's pixels per CSS pixel the strands' widths are measured in. */
  readonly dpr: number
  /** How many specks of dust drift around the strands. */
  readonly dust: number
  /** The share of strands drawn soft, and how soft. */
  readonly softness: number
  /** How many strands to draw. */
  readonly strands: number
}

/** One strip of triangles: `x, y` pairs, and two numbers a vertex beside them. */
export interface RibbonStrip {
  /** Each vertex's place, in CSS pixels. */
  readonly positions: number[]
  /**
   * For a strand, how many spreads from its middle the vertex stands and the
   * light it carries; for a speck, where the vertex stands across it, from
   * `-1` to `1` each way.
   */
  readonly profile: number[]
}

/** A frame's ribbon: a strip a color, and the dust with its light a vertex. */
export interface RibbonMesh {
  /** The specks, and the light each vertex carries, as a share of the dust's color. */
  readonly dust: RibbonStrip & { readonly light: number[] }
  /** The glow's strands, the tint's, the peak over the glow, and the peak over the tint. */
  readonly strips: readonly [RibbonStrip, RibbonStrip, RibbonStrip, RibbonStrip]
}

/** The four strand colors, in the order `strips` holds them, from the palette. */
export const ribbonColors = (palette: StrandsPalette) => {
  const blend = (from: readonly number[], to: readonly number[], share: number) =>
    from.map((channel, i) => mixed(channel, to[i] ?? 0, share)) as [number, number, number]
  const tinted = blend(palette.glow, palette.tint, 0.9)
  return {
    dust: blend(palette.glow, palette.peak, 0.55),
    strands: [
      [...palette.glow] as [number, number, number],
      tinted,
      blend(palette.glow, palette.peak, 0.6),
      blend(tinted, palette.peak, 0.6),
    ] as const,
  }
}

/** The seeds, kept for every id a ribbon has drawn. */
const seeds: StrandSeed[] = []

const seed = (id: number): StrandSeed => {
  seeds[id] ??= seedOf(id)
  return seeds[id]
}

/** Joins the next strip onto `strip` with triangles of no area. */
const join = (strip: RibbonStrip, x: number, y: number, a: number, b: number): void => {
  const { positions, profile } = strip
  if (positions.length === 0) {
    return
  }
  positions.push(positions[positions.length - 2] ?? 0, positions[positions.length - 1] ?? 0, x, y)
  profile.push(profile[profile.length - 2] ?? 0, profile[profile.length - 1] ?? 0, a, b)
}

/** The light a strand carries overall, from its seed and the frame's contrast: the shader's `bright`. */
const brightOf = (r5: number, contrast: number): number => {
  const spread = mixed(1.4, 4.5, contrast)
  const least = mixed(0.35, 0.14, contrast)
  return (mixed(least, 1, r5 ** spread) * 0.5625) / (least + (1 - least) / (spread + 1))
}

/** One vertex pair's width and light, at depth `z`, as the line shader sets them. */
const crossAt = (frame: RibbonFrame, station: Station, s: StrandSeed, z: number) => {
  const { contrast, depth, dpr, softness, time } = frame
  const soft = smooth(0.06, 0.28, station.width) * (s.r6 >= 1 - softness ? 1 : 0)
  const base = mixed(0.35, 1.3, s.r7 * s.r7) * dpr * (1 + (0.3 + 0.5 * depth) * z)
  const focus = depth * smooth(-0.1, -0.9, z) * 4 * dpr
  const w = Math.max(base + soft * mixed(8, 36, s.r6) * dpr + focus, 1)
  const designed = w * 0.228
  const sigma = Math.max(designed, 0.7)
  const drawn = Math.max(w, sigma * 6) + 2.5 * dpr
  const shimmer =
    0.5 + 0.5 * Math.sin(station.along * 0.0035 - time * (0.6 + 0.4 * s.r5) + s.r6 * 6.283)
  const fall = 0.3 + 0.5 * depth
  const near = (1 - fall * (1 - z) * 0.5) / (1 - fall * 0.5)
  const rest = mixed(0.35, 0.15, contrast)
  const light =
    (Math.min(base, w) / w) *
    station.bright *
    (rest + (1 - rest) * shimmer) *
    brightOf(s.r5, contrast) *
    near *
    (designed / sigma)
  return { edge: (drawn * 0.5) / sigma, half: (drawn * 0.5) / dpr, light }
}

/** One strand's strip, joined onto `strip`. */
const layStrand = (
  frame: RibbonFrame,
  stations: readonly Station[],
  s: StrandSeed,
  strip: RibbonStrip,
) => {
  const placed = stations.map((station) => strandAt(frame, station, s))
  const last = placed.length - 1
  for (let k = 0; k <= last; k++) {
    const [x, y, z] = placed[k] ?? [0, 0, 0]
    const [fx, fy] = placed[Math.min(k + 1, last)] ?? [x, y]
    const [bx, by] = placed[Math.max(k - 1, 0)] ?? [x, y]
    let tx = k < last ? fx - x : x - bx
    let ty = k < last ? fy - y : y - by
    const run = Math.hypot(tx, ty)
    if (run > 1e-4) {
      tx /= run
      ty /= run
    } else {
      tx = 0
      ty = 1
    }
    const station = stations[k] as Station
    const { edge, half, light } = crossAt(frame, station, s, z)
    const lx = x + ty * half
    const ly = y - tx * half
    if (k === 0) {
      join(strip, lx, ly, -edge, light)
    }
    strip.positions.push(lx, ly, x - ty * half, y + tx * half)
    strip.profile.push(-edge, light, edge, light)
  }
}

/** The dust: a square a speck, drifting along a strand, brightest where the ribbon is. */
const layDust = (frame: RibbonFrame, line: ReturnType<typeof centerline>): RibbonMesh['dust'] => {
  const dust: RibbonMesh['dust'] = { light: [], positions: [], profile: [] }
  const [from, to] = frame.range
  for (let id = 0; id < frame.dust; id++) {
    const sid = Math.floor(hash(id + 0.5) * frame.strands)
    const r = hash(id + 2.3)
    const r2 = hash(id + 4.1)
    const travel = r + frame.time * 0.003 * (0.3 + r2)
    const station = stationAt(frame, line, mixed(from, to, travel - Math.floor(travel)))
    const [x, y] = strandAt(frame, station, seed(sid))
    const reach = 24 + (150 + station.width * frame.view[0]) * hash(id + 9.7)
    const cx = x + (hash(id + 6.1) - 0.5) * reach
    const cy = y + (hash(id + 8.3) - 0.5) * reach
    const half = mixed(1.2, 3.4, r2 * r2) * 0.5
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame.time * (0.5 + 1.8 * r) + r2 * 40))
    const light = twinkle * mixed(0.2, 0.9, r) * Math.sqrt(station.bright) * 0.8
    if (dust.positions.length > 0) {
      join(dust, cx - half, cy - half, -1, -1)
      dust.light.push(dust.light[dust.light.length - 1] ?? 0, light)
    }
    dust.positions.push(cx - half, cy - half, cx + half, cy - half, cx - half, cy + half)
    dust.positions.push(cx + half, cy + half)
    dust.profile.push(-1, -1, 1, -1, -1, 1, 1, 1)
    dust.light.push(light, light, light, light)
  }
  return dust
}

/**
 * The frame's strands and dust, across `segments` stations of the stretch on
 * screen. Nothing where the path has fewer than two points or no stretch shows.
 */
export const ribbonMesh = (frame: RibbonFrame, segments: number): RibbonMesh => {
  const strip = (): RibbonStrip => ({ positions: [], profile: [] })
  const strips = [strip(), strip(), strip(), strip()] as const
  const [from, to] = frame.range
  if (frame.count < 2 || to <= from) {
    return { dust: { light: [], positions: [], profile: [] }, strips }
  }
  const line = centerline(frame)
  const stations: Station[] = []
  for (let k = 0; k <= segments; k++) {
    stations.push(stationAt(frame, line, mixed(from, to, k / segments)))
  }
  for (let id = 0; id < frame.strands; id++) {
    const s = seed(id)
    const color = (s.r6 >= 0.83 ? 1 : 0) + (s.r7 >= 0.93 ? 2 : 0)
    layStrand(frame, stations, s, strips[color as 0 | 1 | 2 | 3])
  }
  return { dust: layDust(frame, line), strips }
}
