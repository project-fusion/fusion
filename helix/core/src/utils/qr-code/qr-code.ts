/**
 * A QR code's drawing from its value: the modules encoded at a correction
 * level, and the path that draws them, which QR Code's web element and a
 * phone's draw alike.
 */
import { encode } from 'uqr'

/** How much of a damaged code a scanner can still read. */
export type QrCorrection = 'H' | 'L' | 'M' | 'Q'

/** How each module is drawn. */
export type QrStyle = 'dots' | 'rounded' | 'square'

/** The quiet zone, in modules: what the specification asks and a scanner looks for. */
export const QR_QUIET = 4

/** The modules of `value` at `level`, or nothing where the value is too long for a code. */
export const qrModules = (
  value: string,
  level: QrCorrection,
): readonly (readonly boolean[])[] | undefined => {
  try {
    return encode(value, { border: 0, ecc: level }).data
  } catch (error) {
    if (error instanceof RangeError) {
      return undefined
    }
    throw error
  }
}

/** Whether a module is part of one of the three corner squares, with its separator. */
const isFinder = (x: number, y: number, size: number): boolean => {
  const near = (a: number, b: number): boolean => a < 8 && b < 8
  return near(x, y) || near(size - 1 - x, y) || near(x, size - 1 - y)
}

/** Where a path stands and how large a module is drawn: one unit, from the origin, by default. */
export interface QrPlacing {
  /** How far each module is moved, in modules, as the quiet zone moves them. */
  readonly offset?: number
  /** How long one module is drawn. */
  readonly scale?: number
}

/** A number as a path writes it: no more than four decimals, with no trailing zeros. */
const n = (value: number): string => String(Math.round(value * 10_000) / 10_000)

/**
 * The path that draws a code's modules: `all`, the `body` without the
 * corner squares, or the `finders` alone. Square modules run as one
 * rectangle per row; `dots` are circles and `rounded` squircles, each a
 * little under a module so neighbors do not touch.
 */
export const qrPath = (
  matrix: readonly (readonly boolean[])[],
  style: QrStyle,
  only: 'all' | 'body' | 'finders' = 'all',
  { offset = 0, scale = 1 }: QrPlacing = {},
): string => {
  const size = matrix.length
  const at = (value: number): string => n((value + offset) * scale)
  const len = (value: number): string => n(value * scale)
  const wanted = (x: number, y: number): boolean => {
    if (!matrix[y]?.[x]) {
      return false
    }
    if (only === 'all') {
      return true
    }
    return only === 'finders' ? isFinder(x, y, size) : !isFinder(x, y, size)
  }
  const parts: string[] = []
  if (style === 'square') {
    for (let y = 0; y < size; y += 1) {
      let run = 0
      for (let x = 0; x <= size; x += 1) {
        if (wanted(x, y)) {
          run += 1
          continue
        }
        if (run > 0) {
          parts.push(`M${at(x - run)} ${at(y)}h${len(run)}v${len(1)}h-${len(run)}z`)
          run = 0
        }
      }
    }
    return parts.join('')
  }
  const r = style === 'dots' ? 0.45 : 0.28
  const side = 1 - r * 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!wanted(x, y)) {
        continue
      }
      const R = len(r)
      if (style === 'dots') {
        parts.push(
          `M${at(x + 0.5 - r)} ${at(y + 0.5)}a${R} ${R} 0 1 0 ${len(r * 2)} 0a${R} ${R} 0 1 0 ${len(-r * 2)} 0z`,
        )
      } else {
        parts.push(
          `M${at(x + r)} ${at(y)}h${len(side)}a${R} ${R} 0 0 1 ${R} ${R}` +
            `v${len(side)}a${R} ${R} 0 0 1 ${len(-r)} ${R}` +
            `h${len(-side)}a${R} ${R} 0 0 1 ${len(-r)} ${len(-r)}` +
            `v${len(-side)}a${R} ${R} 0 0 1 ${R} ${len(-r)}z`,
        )
      }
    }
  }
  return parts.join('')
}
