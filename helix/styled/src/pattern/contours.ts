/**
 * The contour lines `Pattern` draws, as a tile that repeats without a seam.
 *
 * **Drawn once a page, in script, rather than by an SVG filter.** A filter's
 * threshold on a gently sloping field steps along the pixel grid, so its lines
 * came out as staircases in both Chromium and WebKit. Tracing each level with
 * marching squares and stroking it on a canvas gives an antialiased line.
 *
 * **The field is a sum of waves with whole numbers of turns across the tile**,
 * so its far edges match its near ones and the tile repeats with no seam, which
 * is what lets it drift forever.
 */

/** The tile's edge, in CSS pixels. */
export const CONTOUR_TILE = 480

/** Samples along each edge of the tile. Four pixels apart. */
const CELLS = 120

/** How many lines cross the field's range. */
const LEVELS = 15

/** The waves: turns across the tile on each axis, the strength, and where each starts. */
const WAVES: readonly (readonly [number, number, number, number])[] = [
  [1, 0, 1, 0.3],
  [0, 1, 1, 1.7],
  [1, 1, 0.7, 2.9],
  [2, -1, 0.5, 4.1],
  [1, 2, 0.45, 0.8],
  [3, 1, 0.25, 5.3],
  [-2, 3, 0.2, 3.6],
]

const field = (x: number, y: number): number =>
  WAVES.reduce(
    (sum, [across, down, strength, start]) =>
      sum + strength * Math.sin(2 * Math.PI * (across * x + down * y) + start),
    0,
  )

/** The tile drawn so far, so every `Pattern` on a page shares one. */
let drawn: string | undefined

/**
 * The tile as a PNG data URL, black lines on transparency at twice its size
 * for a sharp line on a dense screen, or nothing where there is no canvas.
 */
export const contourTile = (): string | undefined => {
  if (drawn !== undefined || typeof document === 'undefined') {
    return drawn
  }
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = CONTOUR_TILE * scale
  canvas.height = CONTOUR_TILE * scale
  const context = canvas.getContext?.('2d')
  if (!context) {
    return undefined
  }
  const values: number[][] = []
  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (let row = 0; row <= CELLS; row += 1) {
    const line: number[] = []
    for (let column = 0; column <= CELLS; column += 1) {
      const value = field(column / CELLS, row / CELLS)
      low = Math.min(low, value)
      high = Math.max(high, value)
      line.push(value)
    }
    values.push(line)
  }
  const step = CONTOUR_TILE / CELLS
  context.scale(scale, scale)
  context.lineWidth = 1
  context.lineCap = 'round'
  context.strokeStyle = 'black'
  context.beginPath()
  for (let level = 1; level < LEVELS; level += 1) {
    const at = low + ((high - low) * level) / LEVELS
    for (let row = 0; row < CELLS; row += 1) {
      for (let column = 0; column < CELLS; column += 1) {
        const corners = [
          values[row]?.[column] ?? 0,
          values[row]?.[column + 1] ?? 0,
          values[row + 1]?.[column + 1] ?? 0,
          values[row + 1]?.[column] ?? 0,
        ] as const
        /* Where the level crosses each side of the cell, from corner to corner. */
        const crossings: [number, number][] = []
        const sides = [
          [0, 1, column, row, 1, 0],
          [1, 2, column + 1, row, 0, 1],
          [3, 2, column, row + 1, 1, 0],
          [0, 3, column, row, 0, 1],
        ] as const
        for (const [from, to, x, y, dx, dy] of sides) {
          const a = corners[from]
          const b = corners[to]
          if (a < at !== b < at) {
            const share = (at - a) / (b - a)
            crossings.push([(x + dx * share) * step, (y + dy * share) * step])
          }
        }
        for (let one = 0; one + 1 < crossings.length; one += 2) {
          const start = crossings[one]
          const end = crossings[one + 1]
          if (start && end) {
            context.moveTo(start[0], start[1])
            context.lineTo(end[0], end[1])
          }
        }
      }
    }
  }
  context.stroke()
  drawn = canvas.toDataURL('image/png')
  return drawn
}
