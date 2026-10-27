/**
 * The builders `tokens.ts` writes each token's value with.
 *
 * **Each builder returns the CSS it declares, typed by what it holds.** A
 * length, a color, a duration and the rest are different types, so a
 * misspelled builder, a wrong unit, or a value in the wrong category is a type
 * error in `tokens.ts`. `turbo run token-layer` writes `tokens.css` from the
 * CSS these return.
 *
 * **`helix system` reads the calls as syntax and never runs them.** The Rust
 * registry in `helix/theme/rust/tokens` reads a builder by its name, types
 * the value, and holds it to print back as the same calls, so a value only
 * holds builders, numbers, quoted strings, and the names exported here. It
 * prints each typed value as CSS as well, and `helix system design-tokens`
 * holds that to what these return, token for token.
 *
 * **A reference is typed only by the registry.** `ref()` and `primitive()`
 * name a property, and only the declaration names what it holds, so a
 * reference is accepted wherever a value is and the registry refuses one of
 * the wrong kind.
 */

/** What a builder's value holds. */
export type Kind =
  | 'color'
  | 'component'
  | 'easing'
  | 'families'
  | 'family'
  | 'filters'
  | 'length'
  | 'number'
  | 'quantity'
  | 'reference'
  | 'shadow'
  | 'time'

/** The inside of a `calc()`, and how tightly its operator binds. */
interface Arithmetic {
  /**
   * 1 for a sum or a difference, 2 for a product or a quotient.
   */
  readonly binding: 1 | 2
  /**
   * The arithmetic without `calc()` around it.
   */
  readonly text: string
}

/** A value a builder wrote. */
export interface Value<K extends Kind = Kind> {
  /**
   * The CSS a stylesheet declares for it.
   */
  readonly css: string
  /**
   * What it holds, which decides where it may be written.
   */
  readonly kind: K
  /**
   * Its arithmetic, where it is a `calc()`.
   */
  readonly math?: Arithmetic
  /**
   * The CSS, so a value reads as its declaration in a template.
   */
  toString(): string
}

/** A `linear()` curve, which a spring is drawn with. */
export interface Linear extends Value<'easing'> {
  /**
   * The curve's outputs, evenly spaced.
   */
  readonly stops: readonly number[]
}

/** A spring: the `linear()` curve a stylesheet draws, and the physics it reads. */
export interface Spring extends Value<'easing'> {
  /**
   * The mass, stiffness and damping the curve is a reading of.
   */
  readonly physics: Physics
}

/** A spring's physics. */
export interface Physics {
  /**
   * The damping coefficient, in newton-seconds per meter.
   */
  readonly damping: number
  /**
   * The mass, in kilograms.
   */
  readonly mass: number
  /**
   * The stiffness, in newtons per meter.
   */
  readonly stiffness: number
}

/** A reference, which only the registry types. */
export type Reference = Value<'reference'>

/** A length the type knows to be one: a builder's, or a bare zero. */
export type Measure = Value<'length'> | 0

/** A number the type knows to be one. */
export type Count = number | Value<'number'>

/** A value whose kind only the registry decides. */
export type Loose = Reference | Value<'component'> | Value<'quantity'>

/** A value inside `calc()`. */
export type Operand = Count | Loose | Measure

export type Color = Reference | Value<'color'>
export type Easing = Reference | Value<'easing'>
export type Families = Reference | Value<'families'>
export type Filters = Reference | Value<'filters'>
export type Length = Loose | Measure
export type Amount = Count | Loose
export type Shadow = Reference | Value<'shadow'>
export type Time = Reference | Value<'time'>

/** A component of a relative color: a number, or the origin's own. */
export type Channel = Count | Loose

/** The categories a token's name opens with. */
export type Category =
  | 'border'
  | 'color'
  | 'duration'
  | 'easing'
  | 'font'
  | 'layer'
  | 'leading'
  | 'material'
  | 'opacity'
  | 'radii'
  | 'scrollbar'
  | 'shadow'
  | 'size'
  | 'space'
  | 'text'
  | 'tracking'
  | 'weight'

const built = <K extends Kind>(kind: K, css: string, math?: Arithmetic): Value<K> => ({
  css,
  kind,
  ...(math ? { math } : {}),
  toString: () => css,
})

const text = (value: Count | Value): string =>
  typeof value === 'number' ? String(value) : value.css

const named = (name: string, fallback?: Count | Value): Reference =>
  built('reference', fallback === undefined ? `var(${name})` : `var(${name}, ${text(fallback)})`)

/** A token, by its name after `--helix-`, and what to read where it is unset. */
export const ref = (token: `${Category}-${string}`, fallback?: Count | Value): Reference =>
  named(`--helix-${token}`, fallback)

/** A primitive, by its name after `--_helix-`, and what to read where it is unset. */
export const primitive = (name: string, fallback?: Count | Value): Reference =>
  named(`--_helix-${name}`, fallback)

/** The density seed, which every control size is multiplied by. */
export const density: Value<'number'> = built('number', 'var(--_helix-seed-density)')

/** A length in rems, which grows with the reader's text size. */
export const rem = (value: number): Value<'length'> => built('length', `${value}rem`)

/** A length in CSS pixels, which are points on a device. */
export const px = (value: number): Value<'length'> => built('length', `${value}px`)

/** A length in ems of the text it lands on. */
export const em = (value: number): Value<'length'> => built('length', `${value}em`)

type Sign = '*' | '+' | '-' | '/'

const BINDING: Readonly<Record<Sign, 1 | 2>> = { '-': 1, '*': 2, '/': 2, '+': 1 }

/** An operand of `sign`, in parentheses where it binds more loosely. */
const operand = (value: Operand, sign: Sign, right: boolean): string => {
  if (typeof value === 'number' || value.math === undefined) {
    return text(value)
  }
  const looser = value.math.binding < BINDING[sign]
  const regrouped = right && value.math.binding === BINDING[sign] && (sign === '-' || sign === '/')
  return looser || regrouped ? `(${value.math.text})` : value.math.text
}

const kindOf = (value: Operand): Kind => (typeof value === 'number' ? 'number' : value.kind)

const arithmetic = (sign: Sign, left: Operand, right: Operand): Value => {
  const kinds = [kindOf(left), kindOf(right)]
  const kind = kinds.some((one) => one !== 'length' && one !== 'number')
    ? 'quantity'
    : kinds.includes('length')
      ? 'length'
      : 'number'
  const math = {
    binding: BINDING[sign],
    text: `${operand(left, sign, false)} ${sign} ${operand(right, sign, true)}`,
  }
  return built(kind, `calc(${math.text})`, math)
}

/** `calc()` of a product. */
export function times(left: Measure, right: Count): Value<'length'>
export function times(left: Count, right: Measure): Value<'length'>
export function times(left: Count, right: Count): Value<'number'>
export function times(left: Loose, right: Operand): Value<'quantity'>
export function times(left: Operand, right: Loose): Value<'quantity'>
export function times(left: Operand, right: Operand): Value {
  return arithmetic('*', left, right)
}

/** `calc()` of a quotient. */
export function divide(left: Measure, right: Count): Value<'length'>
export function divide(left: Count, right: Count): Value<'number'>
export function divide(left: Loose, right: Operand): Value<'quantity'>
export function divide(left: Operand, right: Loose): Value<'quantity'>
export function divide(left: Operand, right: Operand): Value {
  return arithmetic('/', left, right)
}

/** `calc()` of a sum. */
export function plus(left: Measure, right: Measure): Value<'length'>
export function plus(left: Count, right: Count): Value<'number'>
export function plus(left: Loose, right: Operand): Value<'quantity'>
export function plus(left: Operand, right: Loose): Value<'quantity'>
export function plus(left: Operand, right: Operand): Value {
  return arithmetic('+', left, right)
}

/** `calc()` of a difference. */
export function minus(left: Measure, right: Measure): Value<'length'>
export function minus(left: Count, right: Count): Value<'number'>
export function minus(left: Loose, right: Operand): Value<'quantity'>
export function minus(left: Operand, right: Loose): Value<'quantity'>
export function minus(left: Operand, right: Operand): Value {
  return arithmetic('-', left, right)
}

/** `value` held between `low` and `high`, such as a component of a relative color. */
export const clamp = (low: Operand, value: Operand, high: Operand): Value<'quantity'> => {
  const inner = (one: Operand) =>
    typeof one === 'number' || one.math === undefined ? text(one) : one.math.text
  return built('quantity', `clamp(${inner(low)}, ${inner(value)}, ${inner(high)})`)
}

/** A length rounded to the nearest multiple of `step`. */
export const round = (value: Length, step: Measure): Value<'quantity'> =>
  built('quantity', `round(${text(value)}, ${text(step)})`)

/** A color by its hex digits, without the `#`. */
export const hex = (digits: string): Value<'color'> => built('color', `#${digits}`)

/** No color at all. */
export const transparent: Value<'color'> = built('color', 'transparent')

/** One color in light mode and another in dark. */
export const lightDark = (light: Color, dark: Color): Value<'color'> =>
  built('color', `light-dark(${light.css}, ${dark.css})`)

/**
 * Two colors mixed in OKLab: `mix(first, 60, second)` takes 60 percent of the
 * first, `mix(first, second, 30)` 30 percent of the second, and
 * `mix(first, second)` half of each.
 */
export function mix(first: Color, percent: number, second: Color): Value<'color'>
export function mix(first: Color, second: Color, percent?: number): Value<'color'>
export function mix(first: Color, middle: Color | number, last?: Color | number): Value<'color'> {
  const [one, other] =
    typeof middle === 'number'
      ? [`${first.css} ${middle}%`, (last as Color).css]
      : [first.css, last === undefined ? middle.css : `${middle.css} ${last}%`]
  return built('color', `color-mix(in oklab, ${one}, ${other})`)
}

/** A color at `percent` of its strength, mixed toward transparent in OKLab. */
export const alpha = (color: Color, percent: number): Value<'color'> =>
  built('color', `color-mix(in oklab, ${color.css} ${percent}%, transparent)`)

/** The origin's lightness, in a relative color. */
export const lightness: Value<'component'> = built('component', 'l')

/** The origin's chroma, in a relative color. */
export const chroma: Value<'component'> = built('component', 'c')

/** The origin's hue, in a relative color. */
export const hue: Value<'component'> = built('component', 'h')

/** A color in OKLCH. */
export const oklch = (l: Channel, c: Channel, h: Channel): Value<'color'> =>
  built('color', `oklch(${text(l)} ${text(c)} ${text(h)})`)

/** A color in OKLCH relative to `origin`, which `lightness`, `chroma` and `hue` read. */
export const relative = (origin: Color, l: Channel, c: Channel, h: Channel): Value<'color'> =>
  built('color', `oklch(from ${origin.css} ${text(l)} ${text(c)} ${text(h)})`)

/** A duration in milliseconds. */
export const ms = (value: number): Value<'time'> => built('time', `${value}ms`)

/** A duration in seconds. */
export const s = (value: number): Value<'time'> => built('time', `${value}s`)

/** A cubic Bézier timing function. */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): Value<'easing'> =>
  built('easing', `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`)

/** A `linear()` timing function through evenly spaced outputs. */
export const linear = (...stops: number[]): Linear => ({
  ...built('easing', `linear(${stops.join(', ')})`),
  stops,
})

/**
 * A spring, by its physics, and the `linear()` curve a stylesheet draws it
 * with. CSS has no spring, so the curve is the CSS.
 */
export const spring = (physics: Physics, curve: Linear): Spring => ({
  ...built('easing', curve.css),
  physics,
})

/** One shadow: two to four lengths, then its color. */
export const shadow = (
  lengths: readonly [x: Length, y: Length, blur?: Length, spread?: Length],
  color?: Color,
): Value<'shadow'> => {
  const words = lengths.filter((one) => one !== undefined).map((one) => text(one))
  return built('shadow', [...words, ...(color ? [color.css] : [])].join(' '))
}

/** Several shadows, the first on top. */
export const shadows = (...layers: Value<'shadow'>[]): Value<'shadow'> =>
  built('shadow', layers.map((one) => one.css).join(', '))

/** No shadow. */
export const none: Value<'shadow'> = built('shadow', 'none')

/** A blur filter. */
export const blur = (radius: Length): Value<'filters'> => built('filters', `blur(${text(radius)})`)

/** A saturation filter. */
export const saturate = (amount: Amount): Value<'filters'> =>
  built('filters', `saturate(${text(amount)})`)

/** Several filters, applied in order. */
export const filters = (...list: Value<'filters'>[]): Value<'filters'> =>
  built('filters', list.map((one) => one.css).join(' '))

/** A family name CSS has to quote, such as `Segoe UI`. */
export const quoted = (name: string): Value<'family'> => built('family', `"${name}"`)

/** A family list, most preferred first. A string is an unquoted name. */
export const families = (...names: (string | Value<'family'>)[]): Value<'families'> =>
  built('families', names.map((one) => (typeof one === 'string' ? one : one.css)).join(', '))
