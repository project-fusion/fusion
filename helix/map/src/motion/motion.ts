/**
 * How a move is animated: the page's own duration and curve.
 *
 * `null` where it is a jump instead, which is what a reader who asked for
 * less motion gets and what a theme whose durations are zero, the `instant`
 * character, asks for.
 */
export interface MapMotion {
  /** In milliseconds. */
  duration: number
  /** Progress through the time in, progress through the move out, both 0 to 1. */
  easing(t: number): number
}

/**
 * Which of the page's paces a move is: a step, a pan or a zoom a reader asked
 * for one press at a time, or a travel, the view carried to a place.
 */
export type MapPace = 'step' | 'travel'

/**
 * The shipped values, for a page with no Helix tokens on it, which still
 * wants the move animated rather than jumped.
 */
const SHIPPED = {
  step: { curve: 'cubic-bezier(0.2, 0, 0, 1)', duration: 200 },
  travel: { curve: 'cubic-bezier(0.3, 0, 0, 1.2)', duration: 320 },
} as const

/** A step a press takes, and a travel to a place: the standard pace and the emphasized. */
const TOKENS = {
  step: { curve: '--helix-easing-standard', duration: '--helix-duration-normal' },
  travel: { curve: '--helix-easing-emphasized', duration: '--helix-duration-slow' },
} as const

/** A CSS time in milliseconds, or `null` where it is not one. */
export const millisecondsOf = (css: string): number | null => {
  const match = /^\s*(-?\d*\.?\d+)(ms|s)\s*$/i.exec(css)
  if (!match) {
    return null
  }
  const value = Number(match[1])
  return match[2]?.toLowerCase() === 's' ? value * 1000 : value
}

/** A cubic Bézier from its two control points, solved for progress at each time. */
const cubic = (x1: number, y1: number, x2: number, y2: number): ((t: number) => number) => {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const x = (s: number): number => ((ax * s + bx) * s + cx) * s
  const y = (s: number): number => ((ay * s + by) * s + cy) * s
  const slope = (s: number): number => (3 * ax * s + 2 * bx) * s + cx
  /* The parameter whose x is the time asked: Newton first, which is quick
     wherever the curve is not flat, then halving, which always lands. */
  const solve = (time: number): number => {
    let s = time
    for (let round = 0; round < 8; round++) {
      const error = x(s) - time
      if (Math.abs(error) < 1e-6) {
        return s
      }
      const d = slope(s)
      if (Math.abs(d) < 1e-6) {
        break
      }
      s -= error / d
    }
    let low = 0
    let high = 1
    s = time
    for (let round = 0; round < 32; round++) {
      const at = x(s)
      if (Math.abs(at - time) < 1e-6) {
        break
      }
      if (at < time) {
        low = s
      } else {
        high = s
      }
      s = (low + high) / 2
    }
    return s
  }
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : y(solve(t)))
}

/**
 * CSS `linear()`: outputs at inputs, joined by straight lines.
 *
 * Each entry is an output and up to two input percentages. Where an input is
 * left out, the first is 0, the last is 100%, and the ones between are spread
 * evenly between the nearest they sit between, which is how the spec places
 * them. An input earlier than the one before it is taken as that one.
 */
const piecewise = (body: string): ((t: number) => number) | null => {
  const points: { at: number | null; value: number }[] = []
  for (const entry of body.split(',')) {
    const parts = entry.trim().split(/\s+/).filter(Boolean)
    const value = Number(parts[0])
    if (parts.length === 0 || Number.isNaN(value)) {
      return null
    }
    const stops = parts
      .slice(1)
      .map((part) => (part.endsWith('%') ? Number(part.slice(0, -1)) / 100 : Number.NaN))
    if (stops.some(Number.isNaN)) {
      return null
    }
    if (stops.length === 0) {
      points.push({ at: null, value })
    }
    for (const stop of stops) {
      points.push({ at: stop, value })
    }
  }
  if (points.length < 2) {
    return null
  }
  const first = points[0]
  const last = points[points.length - 1]
  if (first && first.at === null) {
    first.at = 0
  }
  if (last && last.at === null) {
    last.at = 1
  }
  let latest = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index] as { at: number | null; value: number }
    if (point.at !== null) {
      point.at = Math.max(point.at, latest)
      latest = point.at
      continue
    }
    let next = index + 1
    while ((points[next] as { at: number | null }).at === null) {
      next += 1
    }
    const end = (points[next] as { at: number }).at
    const span = next - index + 1
    point.at = latest + (end - latest) / span
    latest = point.at
  }
  const placed = points as { at: number; value: number }[]
  return (t) => {
    if (t <= 0) {
      return (placed[0] as { value: number }).value
    }
    for (let index = 1; index < placed.length; index++) {
      const from = placed[index - 1] as { at: number; value: number }
      const to = placed[index] as { at: number; value: number }
      if (t <= to.at) {
        return to.at === from.at
          ? to.value
          : from.value + ((t - from.at) / (to.at - from.at)) * (to.value - from.value)
      }
    }
    return (placed[placed.length - 1] as { value: number }).value
  }
}

const KEYWORDS: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-out': [0, 0, 0.58, 1],
}

/**
 * A CSS easing as a function a renderer can call: `cubic-bezier()`, `linear`,
 * `linear()` with its stops, and the four named curves. What it cannot read,
 * `steps()` among it, is the standard curve rather than an error, since a map
 * that eases the wrong way is better than one that throws mid-pan.
 */
export const easingOf = (css: string): ((t: number) => number) => {
  const value = css.trim().toLowerCase()
  if (value === 'linear') {
    return (t) => Math.min(Math.max(t, 0), 1)
  }
  const named = KEYWORDS[value]
  if (named) {
    return cubic(...named)
  }
  const bezier = /^cubic-bezier\(([^)]*)\)$/.exec(value)
  const points = bezier?.[1]?.split(',').map(Number)
  if (points?.length === 4 && points.every((one) => !Number.isNaN(one))) {
    return cubic(...(points as [number, number, number, number]))
  }
  const line = /^linear\(([\s\S]*)\)$/.exec(value)
  const joined = line?.[1] ? piecewise(line[1]) : null
  if (joined) {
    return joined
  }
  return cubic(0.2, 0, 0, 1)
}

/** Whether the reader asked for less motion, read when it is needed. */
export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The motion a move should have, read off the page where the map is at the
 * moment it moves, so a theme that changes changes the next pan with it.
 *
 * **The page's tokens rather than the renderer's defaults.** A step is the
 * standard duration and curve and a travel the slow duration and the
 * emphasized curve, the same pair a panel sliding open takes. A duration of
 * zero is a jump, which is how the `instant` character reads; a page with no
 * Helix tokens gets the shipped values rather than a jump.
 */
export const motionOf = (element: Element, pace: MapPace): MapMotion | null => {
  if (reducedMotion()) {
    return null
  }
  const style = getComputedStyle(element)
  const tokens = TOKENS[pace]
  const duration = millisecondsOf(style.getPropertyValue(tokens.duration)) ?? SHIPPED[pace].duration
  if (duration <= 0) {
    return null
  }
  const curve = style.getPropertyValue(tokens.curve).trim() || SHIPPED[pace].curve
  return { duration, easing: easingOf(curve) }
}
