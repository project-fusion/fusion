/**
 * The night sky `Pattern` draws for `stars`: a tile of points, a tile of
 * halos, and the bright stars and shooting stars laid over them.
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

/** One bright star: where it is, in percent of the box, how big, and its beat. */
export interface BrightStar {
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
 * The bright stars, one in each cell of a four by three grid with a few cells
 * holding two, so they spread across the box without falling in rows.
 */
export const BRIGHT_STARS: readonly BrightStar[] = (() => {
  const random = seeded(17)
  const stars: BrightStar[] = []
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const count = random() < 0.25 ? 2 : 1
      for (let one = 0; one < count; one += 1) {
        stars.push({
          beat: 0.8 + random() * 1.2,
          phase: random(),
          size: 0.45 + random() ** 2 * 0.55,
          x: Math.round(((column + 0.1 + random() * 0.8) / 5) * 1000) / 10,
          y: Math.round(((row + 0.1 + random() * 0.8) / 3) * 1000) / 10,
        })
      }
    }
  }
  return stars
})()

/** Two shooting stars, starting high on the box, falling on beats that rarely meet. */
export const SHOOTING_STARS: readonly ShootingStar[] = [
  { beat: 3, phase: 0.35, x: 78, y: 4 },
  { beat: 4.25, phase: 0.8, x: 42, y: 12 },
]

/** The tiles drawn so far, so every `Pattern` on a page shares them. */
let drawn: { halos: string; points: string } | undefined

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
  for (let one = 0; one < 330; one += 1) {
    const near = one % 7 === 0
    points.push({
      near,
      size: near ? 0.6 + random() ** 2 * 0.7 : 0.35 + random() ** 2 * 0.45,
      strength: near ? 0.5 + random() * 0.5 : 0.15 + random() ** 3 * 0.55,
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
 * The two tiles as PNG data URLs on transparency, or nothing where there is no
 * canvas: the points, each at its own strength, and the soft halos round the
 * nearer ones. **The halos are a tile of their own** so the stylesheet can
 * draw them only in dark, where a glow reads as light; on a light ground they
 * read as smudges.
 */
export const starTiles = (): { halos: string; points: string } | undefined => {
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
  drawn = { halos: canvas.toDataURL('image/png'), points: drawnPoints }
  return drawn
}
