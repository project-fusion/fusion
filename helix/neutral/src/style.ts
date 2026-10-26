/**
 * The values an element's style table is written in. `table.ts` holds the
 * table's own syntax, `styles()`, and the hook and private-value helpers it
 * gives the rules function.
 *
 * **`helix family` reads a table as syntax and never runs it.** Each helper
 * returns a tagged value so a table type-checks in an editor, and the compiler
 * recognizes the call by its name. A table holds literals, arrays, objects, and
 * calls to these helpers, and the compiler refuses anything it would have to
 * execute to read.
 */

import type { Rule } from './table.js'

export * from './rules.js'

/**
 * A value a declaration takes. Arrays join with spaces.
 *
 * A length in characters, `46ch`, or in lines, `1lh`, is a string like any
 * other length. A native view resolves a `ch` to the width of the font's `0`
 * and an `lh` to the part's line height.
 */
export type Value = number | string | Tagged | readonly Value[]

/** A color space a mix is made in other than OKLab. */
export type MixSpace = 'srgb'

/** The quotation mark generated content draws, or the quotation it opens or closes without one. */
export type QuoteMark = 'close' | 'no-close' | 'no-open' | 'open'

/** A value the compiler resolves differently on each platform. */
export type Tagged =
  | {
      /**
       * `+`, `-`, `*` or `/`, between the operands in order.
       */
      readonly calc: string
      /**
       * What the arithmetic is between.
       */
      readonly operands: readonly Value[]
    }
  | {
      /**
       * A private value the element computes from its props, named in full
       * after `--_`, such as `grid-template`.
       */
      readonly derived: string
      /**
       * The value when the props ask for none.
       */
      readonly fallback?: Value
    }
  | {
      /**
       * A CSS-wide keyword.
       */
      readonly keyword: 'inherit' | 'initial' | 'unset'
    }
  | {
      /**
       * What a screen reader says for the mark.
       */
      readonly alt?: Value
      /**
       * The mark.
       */
      readonly quote: QuoteMark
    }
  | {
      /**
       * The value in the light color scheme, then in the dark.
       */
      readonly scheme: readonly [light: Value, dark: Value]
    }
  | {
      /**
       * How much of its content a one-row grid shows: `0`, closed, or `1`, open.
       */
      readonly fit: 0 | 1
    }
  | {
      /**
       * A function the web has and a native view may not, such as `linear-gradient`.
       */
      readonly fn: string
      /**
       * Its arguments, joined with commas.
       */
      readonly arguments: readonly Value[]
    }
  | {
      /**
       * The value when nothing outside sets the hook.
       */
      readonly fallback?: Value
      /**
       * The hook's name after the element's prefix, such as `background-color`.
       */
      readonly hook: string
      /**
       * Another family's prefix, for a hook the element around sets on this
       * one, such as `button`.
       */
      readonly of?: string
    }
  | {
      /**
       * Values joined with commas.
       */
      readonly list: readonly Value[]
    }
  | {
      /**
       * The value where the element around sets none.
       */
      readonly fallback?: Value
      /**
       * A custom property the element around sets, named after `--`.
       */
      readonly inherited: string
    }
  | {
      /**
       * The value before anything measures it.
       */
      readonly fallback?: Value
      /**
       * A length a script measures and sets, named after `--`.
       */
      readonly measured: string
    }
  | {
      /**
       * Two colors and the percentage of the first, mixed in OKLab, or in
       * the color space a fourth names.
       */
      readonly mix: readonly [Value, number, Value] | readonly [Value, number, Value, MixSpace]
    }
  | {
      /**
       * The value when nothing declares it.
       */
      readonly fallback?: Value
      /**
       * A private value, named in full after `--_`, such as `tab-radius`.
       */
      readonly own: string
    }
  | {
      /**
       * A semantic token's name after `--helix-`.
       */
      readonly token: string
    }
  | {
      /**
       * A value that only the web output writes.
       */
      readonly web: Value
    }

/** One declaration: a CSS property and its value. */
export type Declaration = readonly [property: string, value: Value]

/**
 * A private value, `--_<name>`, that the element computes from its props,
 * with the value it takes where the props ask for none. A grid computes
 * `grid-template` from its `min` and `columns`.
 *
 * The name is one of the derivations in `@fusion.dev/helix-core/derivations`.
 * The web element writes the value, and a native view calls the derivation
 * with the element's props. `helix family` refuses a name with no derivation.
 */
export const derive = (name: string, fallback?: Value): Read =>
  fallback === undefined ? { derived: name } : { derived: name, fallback }

/** `a - b`. */
export const difference = (first: Value, second: Value): Tagged => ({
  calc: '-',
  operands: [first, second],
})

/**
 * How much of its content a one-row grid shows, a value of
 * `grid-template-rows` alone: `fit(0)` closed and `fit(1)` open. The web
 * writes `0fr` and `1fr`. A phone measures the content and sets the row's
 * height to it, or to nothing, and a transition of `grid-template-rows` moves
 * the height between them. Once open, the row takes the content's own height,
 * so content that grows or shrinks while open moves nothing it should not.
 */
export const fit = (share: 0 | 1): Tagged => ({ fit: share })

/** A function the web has, such as `linear-gradient`, which a native view may not. */
export const fn = (name: string, ...values: Value[]): Tagged => ({ arguments: values, fn: name })

/**
 * Another family's public hook, `--<family>-<name>`, which the element around
 * sets on this one, as a button group sets each button's corners:
 * `hookOf('button', 'radius-end-end', token('radii-sm'))`. A native view reads
 * it from what the element around gives this one.
 */
export const hookOf = (family: string, name: string, fallback?: Value): Read =>
  fallback === undefined ? { hook: name, of: family } : { fallback, hook: name, of: family }

/** Values joined with commas. */
export const list = (...values: Value[]): Tagged => ({ list: values })

/** A length a script measures and sets, `--<name>`, with its value before then. */
export const measured = (name: string, fallback?: Value): Read =>
  fallback === undefined ? { measured: name } : { fallback, measured: name }

/**
 * `inherit`: the value the element around has. A native view leaves the
 * property unset, so text takes it from the text around it.
 *
 * It is a whole value, such as `['font', inherit()]`, or the fallback of a
 * hook, such as `hook.fontFamily(inherit())`. `helix family` refuses it
 * inside arithmetic, a function, or a value of several words.
 */
export const inherit = (): Tagged => ({ keyword: 'inherit' })

/**
 * A custom property the element around sets, `--<name>`, such as a list's
 * `list-rail-inline-size` on its rows, with the value it takes where none is
 * set.
 */
export const inherited = (name: string, fallback?: Value): Read =>
  fallback === undefined ? { inherited: name } : { fallback, inherited: name }

/**
 * `percent` of `first`, mixed with `second` in OKLab, or in `space`:
 * `mix(own.color, 14, token('color-background'), 'srgb')` mixes the
 * gamma-encoded channels, `color-mix(in srgb, …)` on the web, as a tag's fill
 * is, and a phone mixes the same channels.
 */
export const mix = (first: Value, percent: number, second: Value, space?: MixSpace): Tagged => ({
  mix: space === undefined ? [first, percent, second] : [first, percent, second, space],
})

/** `a * b`. */
export const product = (first: Value, second: Value): Tagged => ({
  calc: '*',
  operands: [first, second],
})

/**
 * `a / b`, where `b` is a number. `helix family` refuses a length or a zero
 * written as the divisor.
 */
export const quotient = (dividend: Value, divisor: Value): Tagged => ({
  calc: '/',
  operands: [dividend, divisor],
})

/**
 * A quotation mark in `content`: `open-quote`, `close-quote`,
 * `no-open-quote`, or `no-close-quote` on the web, with `alt` as what a
 * screen reader says for it, such as `'""'` for nothing.
 *
 * A native view draws the marks of the reader's locale: “ and ” in English,
 * „ and “ in German. A quotation inside another takes the inner pair. The
 * `no-` marks draw nothing. `helix family` refuses a mark in any property
 * other than `content`.
 */
export const quote = (mark: QuoteMark, alt?: Value): Tagged =>
  alt === undefined ? { quote: mark } : { alt, quote: mark }

/**
 * How far content keeps from the window's `edge` to clear the home
 * indicator, a notch, or a rounded corner: `env(safe-area-inset-bottom, 0px)`
 * on the web, and the safe area `HelixRoot` hears on a phone, which is 0 at
 * the bottom while the software keyboard shows. A layer's rules alone read
 * it, as a sheet pads its last row:
 * `paddingBlockEnd: sum(token('space-lg'), safeArea('bottom'))`.
 */
export const safeArea = (edge: 'bottom' | 'left' | 'right' | 'top'): Tagged => ({
  arguments: [`safe-area-inset-${edge}`, '0px'],
  fn: 'env',
})

/**
 * One value in the light color scheme and another in the dark,
 * `light-dark(light, dark)` on the web. A native view takes the one for the
 * theme's mode.
 */
export const scheme = (light: Value, dark: Value): Tagged => ({ scheme: [light, dark] })

/** `a + b + ...`. */
export const sum = (...values: Value[]): Tagged => ({ calc: '+', operands: values })

/** A semantic token, `--helix-<name>`. */
export const token = (name: string): Tagged => ({ token: name })

/**
 * A value only the web output writes, such as a cursor's `zoom-in`, where
 * React Native has the property and not the value.
 *
 * Given rules in place of a value, it is a group of rules the web's alone:
 * `web([rule(...), ...])` says `platform: 'web'` of each one, inside an
 * `on()`. A declaration React Native does not have at all goes in a set's
 * `web: { cursor: 'pointer' }` block.
 */
export function web(rules: readonly Rule[]): Rule
export function web(value: Value): Tagged
export function web(value: Value | readonly Rule[]): Rule | Tagged {
  return { web: value } as Rule | Tagged
}

/**
 * A group of rules a phone's alone: `native([rule(...), ...])` says
 * `platform: 'native'` of each one, inside an `on()`.
 */
export const native = (rules: readonly Rule[]): Rule => ({ native: rules }) as unknown as Rule

/** A value that can take a fallback: a hook, a private value, or a value something else sets. */
export type Read = Extract<
  Tagged,
  | { readonly hook: string }
  | { readonly own: string }
  | { readonly inherited: string }
  | { readonly measured: string }
  | { readonly derived: string }
>

/**
 * The first of several reads that is set, and `fallback` where none is:
 * `first(own.tabHeight, hook.blockSize, token('size-control'))` is the
 * private value, else the hook, else the token. Every argument but the last
 * is a read written with no fallback of its own: a hook, a private value,
 * `hookOf()`, `inherited()`, `measured()`, or `derive()`. It is
 * the chain of fallbacks written inside out, read left to right.
 */
export const first = (head: Read, ...rest: readonly [...Read[], Value]): Tagged => {
  const [next, ...after] = rest
  const fallback: Value =
    after.length === 0 ? (next as Value) : first(next as Read, ...(after as [Value]))
  return { ...head, fallback } as Tagged
}
