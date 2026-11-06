/**
 * A view's transform, from CSS's individual transform properties and its
 * `transform` list.
 *
 * **A style holds a transform as flat values**, because a resolved style is a
 * record of numbers and strings: `translateX`, `translateY`, `rotate`,
 * `scaleX`, and `scaleY` from `translate`, `rotate`, and `scale`, and
 * `transform` as a list of functions whose lengths are already points, such
 * as `translateY(-30%) scale(1.18)`. `stepsOf` writes them as the array a
 * view takes.
 */

/** One step of a view's transform, such as `{ scaleX: 2 }`. */
export type Step = Readonly<Record<string, number | string>>

/** Resolves a length inside a transform to points or a percentage. */
export type Measure = (length: string) => number | string | undefined

/** The flat values a style holds a transform in, in the order CSS applies them. */
export const FLAT = ['translateX', 'translateY', 'rotate', 'scaleX', 'scaleY'] as const

/** What each flat value is where nothing sets it, which moves nothing. */
const IDENTITY: Readonly<Record<(typeof FLAT)[number], number | string>> = {
  rotate: '0deg',
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
}

/**
 * An angle as React Native writes one: `1turn` is `360deg`, a radian stays a
 * radian, and `0` is `0deg`. Nothing where it is no angle.
 */
export const angle = (value: unknown): string | undefined => {
  if (value === 0 || value === '0') {
    return '0deg'
  }
  const match = typeof value === 'string' ? /^(-?\d*\.?\d+)(deg|turn|rad|grad)$/.exec(value) : null
  if (match === null) {
    return undefined
  }
  const amount = Number(match[1])
  switch (match[2]) {
    case 'turn':
      return `${amount * 360}deg`
    case 'grad':
      return `${amount * 0.9}deg`
    default:
      return `${amount}${match[2]}`
  }
}

/** `1.5` or `150%` as a factor. */
const factor = (value: string): number | undefined => {
  const percent = /^(-?\d*\.?\d+)%$/.exec(value)
  const amount = percent === null ? Number(value) : Number(percent[1]) / 100
  return value.trim() === '' || Number.isNaN(amount) ? undefined : amount
}

/** The steps each pair of values writes, or nothing where either is missing. */
const pair = (
  [x, y]: readonly (number | string | undefined)[],
  names: readonly [string, string],
): Step[] | undefined =>
  x === undefined || y === undefined ? undefined : [{ [names[0]]: x }, { [names[1]]: y }]

/** A function of one value, as the step `name` takes it. */
const single =
  (name: string, read: (arg: string) => number | string | undefined) =>
  (args: readonly string[]): Step[] | undefined => {
    const by = args.length === 1 ? read(args[0] ?? '') : undefined
    return by === undefined ? undefined : [{ [name]: by }]
  }

/** What each CSS transform function writes, by its name, from its arguments. */
const functionsOf = (
  measure: Measure,
): Readonly<Record<string, (args: readonly string[]) => Step[] | undefined>> => ({
  rotate: single('rotate', angle),
  rotateZ: single('rotate', angle),
  scale: (args) =>
    args.length > 2
      ? undefined
      : pair([factor(args[0] ?? ''), factor(args[1] ?? args[0] ?? '')], ['scaleX', 'scaleY']),
  scaleX: single('scaleX', factor),
  scaleY: single('scaleY', factor),
  skewX: single('skewX', angle),
  skewY: single('skewY', angle),
  translate: (args) =>
    args.length > 2
      ? undefined
      : pair([measure(args[0] ?? ''), measure(args[1] ?? '0')], ['translateX', 'translateY']),
  translateX: single('translateX', measure),
  translateY: single('translateY', measure),
})

/**
 * The steps a CSS `transform` list writes, such as `translateY(-30%)
 * scale(1.18)`, with each length resolved by `measure`. `none` is no step.
 * Nothing where any function has no native meaning, as a 3D one.
 */
export const parseTransform = (written: string, measure: Measure): Step[] | undefined => {
  const text = written.trim()
  if (text === 'none' || text === '') {
    return []
  }
  const steps: Step[] = []
  const functions = functionsOf(measure)
  const pattern = /([a-zA-Z]+)\(([^)]*)\)/g
  let consumed = ''
  for (const [whole, name = '', inner = ''] of text.matchAll(pattern)) {
    consumed += whole
    const args = inner.split(/\s*,\s*|\s+/).filter((arg) => arg !== '')
    const found = functions[name]?.(args)
    if (found === undefined) {
      return undefined
    }
    steps.push(...found)
  }
  return consumed.replace(/\s/g, '') === text.replace(/\s/g, '') ? steps : undefined
}

/** A length a transform list already holds in points or as a percentage. */
const written: Measure = (length) => {
  if (/^-?\d*\.?\d+%$/.test(length)) {
    return length
  }
  const amount = Number(length.replace(/px$/, ''))
  return Number.isNaN(amount) ? undefined : amount
}

/** Steps as the transform list a style holds: points as bare numbers. */
export const writeTransform = (steps: readonly Step[]): string =>
  steps
    .flatMap((step) => Object.entries(step))
    .map(([name, value]) => `${name}(${value})`)
    .join(' ')

/**
 * A style's transform as the array a view takes, in CSS's order: `translate`,
 * then `rotate`, then `scale`, then the `transform` list. An empty array
 * where the style moves nothing.
 *
 * **`whole` writes every flat value**, each at the value that moves nothing
 * where the style sets none, so two styles of one part, such as two frames of
 * an animation, hold the same steps to move between.
 */
export const stepsOf = (style: Readonly<Record<string, unknown>>, whole = false): Step[] => {
  const set = (name: string) => style[name] !== undefined
  /* A translate or a scale is written in both its steps, as CSS writes one. */
  const kept = (name: (typeof FLAT)[number]) =>
    whole ||
    set(name) ||
    (name.startsWith('translate') && (set('translateX') || set('translateY'))) ||
    (name.startsWith('scale') && (set('scaleX') || set('scaleY')))
  const steps: Step[] = FLAT.filter(kept).map((name) => {
    const value = style[name]
    return {
      [name]: typeof value === 'number' || typeof value === 'string' ? value : IDENTITY[name],
    }
  })
  if (typeof style.transform === 'string') {
    steps.push(...(parseTransform(style.transform, written) ?? []))
  }
  return steps
}

/** A style without the flat values and the list its transform is held in. */
export const withoutTransform = <T extends Readonly<Record<string, unknown>>>(
  style: T,
): Omit<T, (typeof FLAT)[number] | 'transform'> => {
  const { rotate, scaleX, scaleY, transform, translateX, translateY, ...rest } = style
  return rest
}
