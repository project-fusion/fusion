/** How a line gets from one point to the next. */
export type Curve = 'smooth' | 'step' | 'straight'

/** A point in a drawing's own coordinates. */
export type Point = readonly [number, number]

/** Two decimals, which is more than a 100 unit view box can show. */
const round = (value: number): number => Math.round(value * 100) / 100

/**
 * Tangents that cannot overshoot, by Fritsch and Carlson.
 *
 * **The reason `smooth` is monotone cubic and not a Catmull-Rom spline, which
 * is the shorter code.** A spline through the points is free to bulge past them
 * between two of them, so a series whose lowest reading is 40 draws a curve
 * that dips to 32 on the way there. Every value on that curve is a claim about
 * a measurement, and the ones between the readings are the chart's own
 * invention either way; a curve that stays inside the data at least invents
 * nothing the data contradicts.
 *
 * Two rules do it. A tangent at a turning point is flat, so the curve arrives
 * and leaves level rather than carrying on past the peak; and where a tangent
 * is steep enough relative to its neighbors to bulge anyway, the pair is
 * scaled back until it cannot.
 */
const tangents = (xs: readonly number[], ys: readonly number[]): number[] => {
  const count = xs.length
  const secant: number[] = []
  for (let index = 0; index < count - 1; index += 1) {
    secant.push(
      ((ys[index + 1] as number) - (ys[index] as number)) /
        ((xs[index + 1] as number) - (xs[index] as number)),
    )
  }

  const slope: number[] = new Array(count)
  slope[0] = secant[0] as number
  slope[count - 1] = secant[count - 2] as number
  for (let index = 1; index < count - 1; index += 1) {
    const before = secant[index - 1] as number
    const after = secant[index] as number
    // Flat at a turning point, which is what keeps the curve off the outside.
    slope[index] = before * after <= 0 ? 0 : (before + after) / 2
  }

  for (let index = 0; index < count - 1; index += 1) {
    const run = secant[index] as number
    if (run === 0) {
      slope[index] = 0
      slope[index + 1] = 0
      continue
    }
    const from = (slope[index] as number) / run
    const to = (slope[index + 1] as number) / run
    const reach = Math.hypot(from, to)
    if (reach > 3) {
      const scale = 3 / reach
      slope[index] = scale * from * run
      slope[index + 1] = scale * to * run
    }
  }
  return slope
}

/**
 * Builds an SVG path through a set of points.
 *
 * Shared by every chart that draws a line, so the choice of curve is one
 * implementation rather than one per chart. Pure: it takes points and returns a
 * string, and knows nothing about elements or lifecycles.
 *
 * `straight` joins the readings and claims nothing between them, which is why
 * it is the default. `smooth` is easier to follow across a long series and
 * invents the values in between, so it is a reading aid rather than a neutral
 * one. `step` claims the opposite, that a reading holds until the next one, and
 * changes at the midpoint rather than at either end, since a chart's x axis is
 * an order and neither neighbor has a better claim on the moment it moved.
 *
 * Fewer than two points is an empty string rather than a partial path: one
 * reading is not a line, and `M0,0` alone draws nothing while still being a
 * path element that looks like it should.
 */
export const linePath = (points: readonly Point[], curve: Curve = 'straight'): string => {
  if (points.length < 2) {
    return ''
  }
  const [first] = points as [Point]
  const move = `M${round(first[0])},${round(first[1])}`

  if (curve === 'step') {
    return (
      move +
      points
        .slice(1)
        .map(([x, y], index) => {
          const middle = round((((points[index] as Point)[0] ?? 0) + x) / 2)
          return `H${middle}V${round(y)}H${round(x)}`
        })
        .join('')
    )
  }

  if (curve === 'smooth') {
    const xs = points.map(([x]) => x)
    const ys = points.map(([, y]) => y)
    const slope = tangents(xs, ys)
    let drawing = move
    for (let index = 0; index < points.length - 1; index += 1) {
      const reach = ((xs[index + 1] as number) - (xs[index] as number)) / 3
      const fromX = round((xs[index] as number) + reach)
      const fromY = round((ys[index] as number) + (slope[index] as number) * reach)
      const toX = round((xs[index + 1] as number) - reach)
      const toY = round((ys[index + 1] as number) - (slope[index + 1] as number) * reach)
      drawing += `C${fromX},${fromY} ${toX},${toY} ${round(xs[index + 1] as number)},${round(ys[index + 1] as number)}`
    }
    return drawing
  }

  return (
    move +
    points
      .slice(1)
      .map(([x, y]) => `L${round(x)},${round(y)}`)
      .join('')
  )
}
