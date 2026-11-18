/**
 * The night sky `Pattern` draws for `stars`: a tile of points, a tile of
 * halos, a tile of the faint glow the Milky Way's band shows through, and the
 * bright stars and shooting stars laid over them.
 *
 * **Seeded, so every page draws the same sky**, on the server as on the
 * client. The bright stars and the shooting stars are elements the server
 * renders at the same places the client does, and the tiles are drawn once a
 * page, on the client.
 *
 * **Most stars faint and a few bright**, as a real sky is: each point's
 * brightness is a random number raised to a power, so the field reads as depth
 * where points of one size and strength read as dust.
 */

/** The tile's edge, in CSS pixels. */
export const STAR_TILE = 704

/** A random number generator from a seed, so the sky is the same on every page. */
const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** One bright star: where it is, in percent of the box, how big, its color, and its beat. */
export interface BrightStar {
  /** Its color in dark, a hot blue-white or a cool orange, or the ink's own where absent. */
  tint?: 'cool' | 'warm'
  /** Whether it is bright enough to show the four thin spikes a lens draws round a star. */
  spikes: boolean
  /** From the start of the box, in percent. */
  x: number
  /** From the top of the box, in percent. */
  y: number
  /** Its size, as a share of the largest, from 0.45 to 1. */
  size: number
  /** How many crawl durations one twinkle takes. */
  beat: number
  /** How far into its beat it starts, as a share of the beat. */
  phase: number
}

/** One shooting star: where it starts, in percent of the box, and when it falls. */
export interface ShootingStar {
  /** From the start of the box, in percent. */
  x: number
  /** From the top of the box, in percent. */
  y: number
  /** How many crawl durations pass between two falls. */
  beat: number
  /** How far into its beat it starts, as a share of the beat. */
  phase: number
}

/**
 * The bright stars, one in most cells of a five by three grid, so they spread
 * across the box without falling in rows. **Few and mostly small**, as the
 * brightest stars of a real sky are: a size is a random number raised to a
 * power, the four largest show spikes, and about a third take a color.
 */
export const BRIGHT_STARS: readonly BrightStar[] = (() => {
  const random = seeded(17)
  const stars: BrightStar[] = []
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      if (random() < 0.15) {
        continue
      }
      const hue = random()
      stars.push({
        beat: 0.5 + random() * 0.9,
        phase: random(),
        size: Math.round((0.35 + random() ** 3 * 0.65) * 100) / 100,
        spikes: false,
        ...(hue < 0.2 ? { tint: 'cool' as const } : hue < 0.35 ? { tint: 'warm' as const } : {}),
        x: Math.round(((column + 0.1 + random() * 0.8) / 5) * 1000) / 10,
        y: Math.round(((row + 0.1 + random() * 0.8) / 3) * 1000) / 10,
      })
    }
  }
  for (const star of [...stars].sort((one, two) => two.size - one.size).slice(0, 4)) {
    star.spikes = true
  }
  return stars
})()

/** Two shooting stars, starting high on the box, falling on beats that rarely meet. */
export const SHOOTING_STARS: readonly ShootingStar[] = [
  { beat: 3, phase: 0.35, x: 78, y: 4 },
  { beat: 4.25, phase: 0.8, x: 42, y: 12 },
]

/** The tiles drawn so far, so every `Pattern` on a page shares them. */
let drawn: StarTiles | undefined

/** The three tiles, as PNG data URLs on transparency. */
export interface StarTiles {
  /** The faint glow the Milky Way's band shows through, mottled like a cloud. */
  dust: string
  /** The soft halos round the nearer points. */
  halos: string
  /** The points, each at its own strength. */
  points: string
}

/** One point of the field: where, how strong, and how big. */
interface Point {
  x: number
  y: number
  strength: number
  size: number
  near: boolean
}

/** The field's points: many faint ones far off, and fewer, larger ones nearer. */
const field = (): Point[] => {
  const random = seeded(3)
  const points: Point[] = []
  for (let one = 0; one < 460; one += 1) {
    const near = one % 9 === 0
    points.push({
      near,
      size: near ? 0.55 + random() ** 2 * 0.6 : 0.3 + random() ** 3 * 0.4,
      strength: near ? 0.45 + random() * 0.55 : 0.1 + random() ** 4 * 0.6,
      x: random() * STAR_TILE,
      y: random() * STAR_TILE,
    })
  }
  return points
}

/**
 * Draws a tile on transparency at twice its size, for a sharp point on a
 * dense screen. A point near an edge is drawn again past the opposite one, so
 * the tile repeats with no seam.
 */
const tile = (
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  draw: (point: Point, x: number, y: number) => void,
): void => {
  context.clearRect(0, 0, STAR_TILE, STAR_TILE)
  for (const point of points) {
    for (const dx of [-STAR_TILE, 0, STAR_TILE]) {
      for (const dy of [-STAR_TILE, 0, STAR_TILE]) {
        const x = point.x + dx
        const y = point.y + dy
        if (x > -8 && y > -8 && x < STAR_TILE + 8 && y < STAR_TILE + 8) {
          draw(point, x, y)
        }
      }
    }
  }
}

/**
 * **Cloud-like noise that repeats with the tile**: values on a coarse lattice
 * that wraps at its edges, eased between, at four scales each half the last.
 * From 0 to about 1.
 */
const cloud = (size: number): Float32Array => {
  const random = seeded(29)
  const out = new Float32Array(size * size)
  let weight = 0.5
  let total = 0
  for (const cells of [4, 8, 16, 32]) {
    const lattice = Array.from({ length: cells * cells }, () => random())
    const at = (x: number, y: number): number =>
      lattice[((y + cells) % cells) * cells + ((x + cells) % cells)] ?? 0
    const ease = (t: number): number => t * t * (3 - 2 * t)
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = (x / size) * cells
        const v = (y / size) * cells
        const x0 = Math.floor(u)
        const y0 = Math.floor(v)
        const sx = ease(u - x0)
        const sy = ease(v - y0)
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
        const index = y * size + x
        out[index] = (out[index] ?? 0) + (top + (bottom - top) * sy) * weight
      }
    }
    total += weight
    weight /= 2
  }
  for (let index = 0; index < out.length; index += 1) {
    out[index] = (out[index] ?? 0) / total
  }
  return out
}

/**
 * The three tiles as PNG data URLs on transparency, or nothing where there is
 * no canvas: the points, each at its own strength, the soft halos round the
 * nearer ones, and the dust the band of the Milky Way shows through. **The
 * halos and the dust are tiles of their own** so the stylesheet can draw them
 * only in dark, where a glow reads as light; on a light ground they read as
 * smudges.
 */
export const starTiles = (): StarTiles | undefined => {
  if (drawn !== undefined || typeof document === 'undefined') {
    return drawn
  }
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = STAR_TILE * scale
  canvas.height = STAR_TILE * scale
  const context = canvas.getContext?.('2d')
  if (!context) {
    return undefined
  }
  context.scale(scale, scale)
  const points = field()
  tile(context, points, (point, x, y) => {
    context.fillStyle = `rgba(0, 0, 0, ${point.strength})`
    context.beginPath()
    context.arc(x, y, point.size, 0, Math.PI * 2)
    context.fill()
  })
  const drawnPoints = canvas.toDataURL('image/png')
  tile(
    context,
    points.filter((point) => point.near),
    (point, x, y) => {
      const radius = point.size * 4
      const halo = context.createRadialGradient(x, y, 0, x, y, radius)
      halo.addColorStop(0, `rgba(0, 0, 0, ${point.strength * 0.35})`)
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = halo
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    },
  )
  const drawnHalos = canvas.toDataURL('image/png')
  /* **The dust at a quarter of the tile's pixels**, since it is soft and the
     stylesheet stretches it back: lanes where the noise is low, a glow where
     it is high, never more than a faint one. */
  const size = STAR_TILE / 4
  const dust = document.createElement('canvas')
  dust.width = size
  dust.height = size
  const dusty = dust.getContext('2d')
  if (!dusty) {
    return undefined
  }
  const image = dusty.createImageData(size, size)
  const noise = cloud(size)
  for (let index = 0; index < noise.length; index += 1) {
    const glow = Math.min(1, Math.max(0, ((noise[index] ?? 0) - 0.3) / 0.38))
    image.data[index * 4 + 3] = Math.round(glow ** 1.4 * 255 * 0.42)
  }
  dusty.putImageData(image, 0, 0)
  drawn = { dust: dust.toDataURL('image/png'), halos: drawnHalos, points: drawnPoints }
  return drawn
}
