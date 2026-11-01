/**
 * How one part's values resolve: tokens, hooks, private values, units, and
 * arithmetic, under the rules that reach the part.
 *
 * **Custom properties inherit down the part tree, as on the web.** A value
 * set on the host reaches every part, one set on a part reaches the parts
 * inside it, and an inner one wins over an outer one.
 */

import { length } from './apply.js'
import { calc, LINED, percentCalc, rounded, viewported } from './calc.js'
import { mix, movedLightness, writtenColor } from './color.js'
import type { Context } from './context.js'
import type { Family, Rule, Value } from './form.js'
import { measuredCalc } from './grid/form.js'
import { fromOklch } from './oklch.js'
import { numeral } from './reads.js'
import type { Resolution } from './resolved.js'
import { derive, quotationMark } from './values.js'

/** A hook's value that names a Helix token alone, `var(--helix-text-md)`. */
const TOKEN_REF = /^var\(\s*--helix-([a-z0-9-]+)\s*\)$/

/** The safe area's edge `env()` reads, as `safeArea()` writes it. */
const SAFE_AREA = /^safe-area-inset-(bottom|left|right|top)$/

/**
 * The CSS functions that compare or round lengths, which a native view
 * resolves where every argument is a length in points, and leaves as words
 * otherwise. `round()` takes a value and a step, and a tie goes up, as CSS has
 * it.
 */
export const COMPARED: Readonly<Record<string, (...lengths: number[]) => number>> = {
  max: Math.max,
  min: Math.min,
  round: (value = 0, step = 1) => Math.round(value / step) * step,
}

/**
 * How far `written` moves a color's lightness, `calc(l - 0.05)` as words or a
 * sum of `l` and a number. Undefined for anything else.
 */
const lightnessStep = (
  written: Value,
  resolve: (value: Value) => Resolution,
): number | undefined => {
  if ('text' in written) {
    const found = /^calc\(l ([-+]) ([\d.]+)\)$/.exec(written.text)
    return found === null ? undefined : Number(found[2]) * (found[1] === '-' ? -1 : 1)
  }
  if ('calc' in written && written.calc.op === '+') {
    const [lightness, step] = written.calc.operands
    const amount = step === undefined ? undefined : resolve(step)
    return lightness !== undefined &&
      'text' in lightness &&
      lightness.text === 'l' &&
      typeof amount === 'number'
      ? amount
      : undefined
  }
  return undefined
}

/**
 * **A relative color that moves only lightness**, `oklch(from <color> <l> c h)`,
 * which React Native does not draw, as the color it comes to, so a solid
 * control's press steps past its hover fill as it does on the web. Undefined for
 * any other `oklch()`, and where its color has no value.
 */
const relativeLightness = (
  written: readonly Value[],
  resolve: (value: Value) => Resolution,
): string | undefined => {
  const whole = written[0]
  if (whole === undefined || !('space' in whole) || whole.space.length !== 5) {
    return undefined
  }
  const [from, color, lightness, chroma, hue] = whole.space as readonly [
    Value,
    Value,
    Value,
    Value,
    Value,
  ]
  const kept = (one: Value, word: string): boolean => 'text' in one && one.text === word
  if (!kept(from, 'from') || !kept(chroma, 'c') || !kept(hue, 'h')) {
    return undefined
  }
  const base = resolve(color)
  const step = lightnessStep(lightness, resolve)
  return typeof base === 'string' && step !== undefined ? movedLightness(base, step) : undefined
}

/** What `resolverFor` reads: the part, the rules that reach it, and its own values. */
export interface Scope {
  /** Whether a rule is on this part, or on a part it is as well. */
  readonly aimed: (rule: Rule) => boolean
  readonly context: Context
  readonly family: Family
  /** The parts from the host down to this one. */
  readonly levels: readonly string[]
  /** The private values the part's own rules set. */
  readonly own: ReadonlyMap<string, Value>
  readonly part: string
  /** Whether a rule is on a part, and not on a region. */
  readonly plain: (rule: Rule) => boolean
  readonly rules: readonly Rule[]
}

/** What resolves a part's values. */
export interface Resolver {
  /** The custom properties the part inherits and sets, built the first time one is read. */
  readonly custom: () => ReadonlyMap<string, Resolution>
  readonly resolve: (value: Value) => Resolution
  /**
   * `value`, with a percentage in a `calc()` taken of `width`, as a flex
   * basis is of its container's measured line.
   */
  readonly resolveAcross: (value: Value, width: number | undefined) => Resolution
  /** Whether a value leaves its property unset. */
  readonly unsets: (value: Value) => boolean
  /** A private value by name, or its fallback. */
  readonly valued: (name: string, fallback: Value | undefined) => Resolution
}

/** The resolver for one part, under `scope`. */
export const resolverFor = ({
  aimed,
  context,
  family,
  levels,
  own,
  part,
  plain,
  rules,
}: Scope): Resolver => {
  let across: number | undefined
  const rem = context.rem ?? 16
  const spaceRem = context.spaceRem ?? rem
  /* `initial` as a custom property's value is the guaranteed-invalid value,
     so a `var()` that reads it takes its fallback. */
  const valued = (name: string, fallback: Value | undefined): Resolution => {
    const set = own.get(name)
    const value = set === undefined ? context.inherited?.[name] : resolve(set)
    if (value === undefined || value === 'initial') {
      return fallback === undefined ? undefined : resolve(fallback)
    }
    return value
  }
  /* The line height an `lh` is: the innermost one declared from the host
     down to the part, read as a length. An `lh` inside a line height is the
     one the part inherits, as CSS reads it there. */
  let lining = false
  const lineHeight = (): Resolution => {
    const inherited = context.lineHeight === undefined ? '1.2em' : `${context.lineHeight}px`
    let declared: Value | undefined
    for (const level of levels) {
      for (const rule of rules) {
        const here = (rule.target === level && plain(rule)) || (level === part && aimed(rule))
        if (here && rule.inner === undefined && rule.slotted === undefined) {
          for (const [property, value] of rule.set) {
            declared = property === 'line-height' ? value : declared
          }
        }
      }
    }
    if (declared === undefined || lining) {
      return inherited
    }
    lining = true
    const resolved = resolve(declared)
    lining = false
    return typeof resolved === 'number'
      ? `${resolved}em`
      : resolved === undefined || resolved === 'normal'
        ? inherited
        : resolved
  }
  /* **A `ch` is the width of the font's `0`, and an `lh` the line height**,
     each written as the ems or the length it comes to, which the property it
     lands in resolves as it does any other length. */
  const units = (resolved: Resolution): Resolution => {
    const seen = viewported(resolved, context.viewport)
    if (seen !== undefined) {
      return seen
    }
    const match = typeof resolved === 'string' ? LINED.exec(resolved.trim()) : null
    if (match === null) {
      return resolved
    }
    const amount = Number(match[1])
    return match[2] === 'ch'
      ? `${rounded(amount * (context.zero ?? 0.5), 4)}em`
      : calc('*', [lineHeight(), amount])
  }
  /* **Custom properties inherit down the part tree, as on the web**: the
     host's own, under what the element around sets on it, which a `:host`
     rule loses to, then each part's from the host down, an inner one over an
     outer. Each is resolved where it is declared, so one that reads its own
     name reads the value from outside it. Built the first time a hook or a
     token reads it. */
  const customs = new Map<string, Resolution>()
  let customsBuilt = false
  const custom = (): ReadonlyMap<string, Resolution> => {
    if (customsBuilt) {
      return customs
    }
    customsBuilt = true
    for (const level of levels) {
      for (const rule of rules) {
        if (rule.target !== level || !plain(rule) || rule.slotted !== undefined) {
          continue
        }
        if (rule.inner !== undefined) {
          continue
        }
        for (const [property, value] of rule.set) {
          if (property.startsWith('--')) {
            customs.set(property.slice(2), resolve('web' in value ? value.web : value))
          }
        }
      }
      if (level === 'host') {
        for (const [name, value] of Object.entries(context.custom ?? {})) {
          customs.set(name, value)
        }
        for (const [name, value] of Object.entries(context.hooks ?? {})) {
          customs.set(`${family.name}-${name}`, value)
        }
      }
    }
    return customs
  }
  /* A hook's whole name, the element's own prefix or another family's.
     `initial` is the guaranteed-invalid value, which takes the fallback. */
  const hooked = (hook: { readonly name: string; readonly of?: string }): Resolution => {
    const set = custom().get(`${hook.of ?? family.name}-${hook.name}`)
    return set === 'initial' ? undefined : set
  }
  /* **A private value the element around sets is read by its name on the
     web**, `--_avatar-group-clear`, which the element around declares as
     `avatar-group-clear`. **A custom property set on the element**, as a
     list's `--list-rail-style` is from its `style`, is read as the web reads
     it there. */
  const inheritedOf = (name: string): Resolution =>
    context.inherited?.[name] ??
    (name.startsWith('_') ? context.inherited?.[name.slice(1)] : custom().get(name))
  /* A CSS-wide keyword, or a variable whose fallback is one, leaves the
     property unset, so text takes it from the text around it and a box keeps
     the view's own default. */
  const unsets = (value: Value): boolean => {
    const unset = (set: unknown, fallback: Value | undefined) =>
      set === undefined && fallback !== undefined && unsets(fallback)
    if ('keyword' in value) {
      return true
    }
    if ('hook' in value) {
      return unset(hooked(value.hook), value.hook.fallback)
    }
    if ('inherited' in value) {
      return unset(inheritedOf(value.inherited.name), value.inherited.fallback)
    }
    if ('own' in value) {
      return unset(valued(value.own.name, undefined), value.own.fallback)
    }
    if ('derived' in value) {
      const props = context.props ?? context.conditions
      return unset(derive(value.derived.function, props), value.derived.fallback)
    }
    return false
  }
  /* **A hook set to a `color-mix()` is the color it works out to**, as an
     author's fill is in a chat's `author-styles`: a device draws nothing for
     the words. */
  const variable = (name: string) =>
    custom().get(name) ?? (name.startsWith('helix-') ? context.tokens[name.slice(6)] : undefined)
  const writtenMix = (set: Resolution): Resolution =>
    typeof set === 'string' && set.includes('color-mix(') ? writtenColor(set, variable) : set
  const resolve = (value: Value): Resolution => {
    if ('text' in value) {
      /* A native view inherits no color, so `currentColor` is resolved here,
         before a mix reads it. */
      return value.text.toLowerCase() === 'currentcolor'
        ? (context.currentColor ?? context.tokens['color-foreground'])
        : units(value.text)
    }
    if ('scheme' in value) {
      return resolve(context.scheme === 'dark' ? value.scheme.dark : value.scheme.light)
    }
    if ('quote' in value) {
      return quotationMark(value.quote.mark, context.locale, context.quoted)
    }
    if ('derived' in value) {
      const derived = derive(value.derived.function, context.props ?? context.conditions)
      return (
        derived ??
        (value.derived.fallback === undefined ? undefined : resolve(value.derived.fallback))
      )
    }
    if ('number' in value) {
      return value.number
    }
    if ('token' in value) {
      /* A token the element or the one around it overrides, as a toolbar
         sets a smaller control height for what it holds. */
      return custom().get(`helix-${value.token}`) ?? context.tokens[value.token]
    }
    if ('own' in value) {
      return valued(value.own.name, value.own.fallback)
    }
    if ('hook' in value) {
      const hookSet = hooked(value.hook)
      /* **A hook set to a token, `var(--helix-text-md)`, is that token's
         value**, as code shared with the web writes a hook in a `style`. */
      const ref = typeof hookSet === 'string' ? TOKEN_REF.exec(hookSet.trim()) : null
      const set =
        ref?.[1] === undefined
          ? writtenMix(hookSet)
          : (custom().get(`helix-${ref[1]}`) ?? context.tokens[ref[1]])
      if (set !== undefined) {
        return typeof set === 'string'
          ? units(fromOklch(set))
          : typeof set === 'number'
            ? units(set)
            : set
      }
      return value.hook.fallback === undefined ? undefined : resolve(value.hook.fallback)
    }
    if ('inherited' in value) {
      const set = inheritedOf(value.inherited.name)
      return (
        set ??
        (value.inherited.fallback === undefined ? undefined : resolve(value.inherited.fallback))
      )
    }
    if ('measured' in value) {
      /* **A measured length in characters or lines is one too**, as a
         slider's readout keeps room for its widest value in `ch`. */
      const set = context.measured?.[value.measured.name]
      return set === undefined
        ? value.measured.fallback === undefined
          ? undefined
          : resolve(value.measured.fallback)
        : typeof set === 'string'
          ? units(set)
          : set
    }
    if ('calc' in value) {
      const operands = value.calc.operands.map(resolve)
      if (across !== undefined) {
        return (
          measuredCalc(value.calc.op, operands, across, (one) =>
            length(one, rem, context.fontSize ?? rem),
          ) ?? calc(value.calc.op, operands)
        )
      }
      /* A share of what the property's length is of, which only that can
         finish. Points beside a share are space, as a ring's stroke is. */
      return (
        percentCalc(value.calc.op, operands, (one) =>
          length(one, spaceRem, context.fontSize ?? spaceRem),
        ) ?? calc(value.calc.op, operands)
      )
    }
    if ('function' in value) {
      /* A counter is the value the element around counted for this one,
         written as the style asks. */
      if (value.function.name === 'counter') {
        const [name, written] = value.function.arguments.map(resolve)
        const at = typeof name === 'string' ? context.counters?.[name] : undefined
        return at === undefined
          ? undefined
          : numeral(at, typeof written === 'string' ? written : 'decimal')
      }
      /* **The safe area is the layer host's**, in points, which keeps none at
         the bottom while the keyboard covers it. A host that is no layer
         reads the share of it that reaches into the host, and the fallback
         before it is measured. */
      if (value.function.name === 'env') {
        const [inset, fallback] = value.function.arguments
        const edge =
          inset !== undefined && 'text' in inset ? SAFE_AREA.exec(inset.text)?.[1] : undefined
        const at =
          edge === undefined
            ? undefined
            : context.viewport?.insets?.[edge as 'bottom' | 'left' | 'right' | 'top']
        return at ?? (fallback === undefined ? undefined : resolve(fallback))
      }
      if (value.function.name === 'oklch') {
        const moved = relativeLightness(value.function.arguments, resolve)
        if (moved !== undefined) {
          return moved
        }
      }
      /* **`min()` and `max()` of lengths are the least or the most of them**,
         in points, as a segment keeps three pixels unless it draws less. */
      const compared = COMPARED[value.function.name]
      if (compared !== undefined) {
        const lengths = value.function.arguments
          .map(resolve)
          .map((one) => length(one, spaceRem, context.fontSize ?? spaceRem))
        if (lengths.every((one): one is number => typeof one === 'number')) {
          return compared(...lengths)
        }
      }
      /* An argument of several words, as a gradient's `red 50%`, keeps its
         spaces, and the arguments take commas. **An argument that resolves
         to nothing leaves the whole value unset**, as a `var()` with no
         value and no fallback makes the web's declaration invalid, so a
         scroll area's painted fade draws only while its color is set. */
      const resolved = value.function.arguments.map(resolve)
      if (resolved.some((argument) => argument === undefined)) {
        return undefined
      }
      const written = resolved.map((argument) =>
        Array.isArray(argument) ? argument.join(' ') : argument,
      )
      return `${value.function.name}(${written.join(', ')})`
    }
    if ('mix' in value) {
      const first = resolve(value.mix.first)
      const second = resolve(value.mix.second)
      return typeof first === 'string' && typeof second === 'string'
        ? mix(first, value.mix.percent, second, value.mix.space)
        : undefined
    }
    if ('space' in value) {
      return value.space.map(resolve)
    }
    if ('list' in value) {
      return value.list.map(resolve)
    }
    return undefined
  }
  const resolveAcross = (value: Value, width: number | undefined): Resolution => {
    across = width
    const resolved = resolve(value)
    across = undefined
    return resolved
  }
  return { custom, resolve, resolveAcross, unsets, valued }
}
