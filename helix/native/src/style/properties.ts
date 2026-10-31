/**
 * The CSS properties a view, its text, or a shape takes through more than a
 * new name: a transform, a shadow list, an edge, a text's line limit, a
 * shape's paint, and a layout shorthand.
 *
 * **`apply.ts` asks this table first.** A property here is written into
 * the style by its mapping, which says why where it cannot be. A property
 * that only takes a new name stays in `RENAMED`, in `apply.ts`.
 */

import { EDGES, fourSides } from './edges.js'
import {
  factor,
  flexed,
  kept,
  lengths,
  type Mapping,
  type Space,
  wordsOf,
  written,
} from './mapping.js'
import { angle, parseTransform, writeTransform } from './transforms.js'
import { TYPOGRAPHY } from './typography.js'

/** A paint's length: a bare number is the shape's own units, as SVG reads it. */
const paintLength =
  (name: string): Mapping =>
  (out, value, space) => {
    /* A share of the vector's box and points, as a ring's radius is
       `calc(50% + -4px)`, which the vector resolves against its box. */
    if (typeof value === 'string' && /^calc\(-?[\d.]+% \+ -?[\d.]+px\)$/.test(value)) {
      out[name] = value
      return undefined
    }
    const measured = typeof value === 'number' ? value : space(value)
    if (measured === undefined || measured === 'auto') {
      return 'not a length'
    }
    out[name] = measured
    return undefined
  }

/**
 * A gradient's lengths in points, which React Native's gradient parser
 * reads, where the theme writes them in rems.
 */
const gradientOf = (written: string, space: Space): string =>
  written.replace(/(-?\d*\.?\d+(?:rem|em))\b/g, (length) => {
    const measured = space(length)
    return typeof measured === 'number' ? `${measured}px` : length
  })

/** How a repeating gradient's tile is sized, by the side it runs to. */
const TILES: Readonly<Record<string, (length: string) => string>> = {
  'to bottom': (length) => `100% ${length}`,
  'to left': (length) => `${length} 100%`,
  'to right': (length) => `${length} 100%`,
  'to top': (length) => `100% ${length}`,
}

/**
 * **A repeating linear gradient is one tile of it, repeated**, since React
 * Native draws no repeating gradient: the same stops as a linear gradient,
 * on a tile as long as its last stop along the way it runs, as a pending
 * timeline line is a dash and a gap drawn again down its length. Only a
 * gradient that runs to a side, with its last stop in points, has a tile.
 */
const repeatingOf = (written: string): Readonly<Record<string, string>> | undefined => {
  const found = /^repeating-linear-gradient\((to (?:top|right|bottom|left)),(.*)\)$/.exec(written)
  const tile = found?.[1] === undefined ? undefined : TILES[found[1]]
  const last = found?.[2] === undefined ? undefined : /(\d*\.?\d+px)\s*$/.exec(found[2])?.[1]
  if (tile === undefined || last === undefined || found?.[2] === undefined) {
    return undefined
  }
  return {
    backgroundImage: `linear-gradient(${found[1]},${found[2]})`,
    backgroundRepeat: 'repeat',
    backgroundSize: tile(last),
  }
}

/** Each mapping, by CSS property. */
export const DRAWN: Readonly<Record<string, Mapping>> = {
  ...EDGES,
  ...TYPOGRAPHY,
  'align-content': (out, value) => {
    const aligned = flexed(wordsOf(value)[0])
    if (aligned !== undefined) {
      out.alignContent = aligned
    }
    return undefined
  },
  'aspect-ratio': (out, value) => {
    const numbers = wordsOf(value).filter((word) => word !== 'auto' && word !== '/')
    const [width, height = 1] = numbers.flatMap((word) => String(word).split('/')).map(Number)
    if (width === undefined || Number.isNaN(width) || Number.isNaN(height) || height === 0) {
      return wordsOf(value).includes('auto') ? undefined : 'not a ratio'
    }
    out.aspectRatio = width / height
    return undefined
  },
  'background-image': (out, value, space) => {
    const written = (Array.isArray(value) ? value.map(String) : [String(value)]).join(', ')
    if (written === 'none') {
      return undefined
    }
    const repeating = repeatingOf(gradientOf(written, space))
    if (repeating !== undefined) {
      Object.assign(out, repeating)
      return undefined
    }
    if (!/^(linear|radial)-gradient\(/.test(written)) {
      return `${written.split('(')[0]}() has no native equivalent yet`
    }
    out.backgroundImage = gradientOf(written, space)
    return undefined
  },
  'background-position': (out, value, space) => {
    out.backgroundPosition = written(value, space)
    return undefined
  },
  'background-repeat': kept('backgroundRepeat'),
  'background-size': (out, value, space) => {
    out.backgroundSize = written(value, space)
    return undefined
  },
  cx: paintLength('cx'),
  cy: paintLength('cy'),
  fill: kept('fill'),
  'fill-opacity': kept('fillOpacity'),
  flex: (out, value, space) => {
    if (typeof value === 'number') {
      out.flex = value
      return undefined
    }
    const words = wordsOf(value).map((word) =>
      typeof word === 'string' && /^\d*\.?\d+$/.test(word) ? Number(word) : word,
    )
    const named: Readonly<Record<string, readonly (number | string)[]>> = {
      auto: [1, 1, 'auto'],
      initial: [0, 1, 'auto'],
      none: [0, 0, 'auto'],
    }
    const [grow = 1, second, third] = named[String(words[0])] ?? words
    const shrink = typeof second === 'number' ? second : 1
    const basis = typeof second === 'number' ? third : second
    if (typeof grow !== 'number' || words.length > 3) {
      return 'not a grow, a shrink, and a basis'
    }
    out.flexGrow = grow
    out.flexShrink = shrink
    const measured = basis === undefined ? 0 : space(basis)
    if (measured === undefined) {
      return 'not a basis'
    }
    if (measured !== 'auto') {
      out.flexBasis = measured
    }
    return undefined
  },
  inset: fourSides(['top', 'right', 'bottom', 'left']),
  'inset-block': lengths('top', 'bottom'),
  'inset-inline': lengths('start', 'end'),
  'justify-items': () => undefined,
  'justify-self': (out, value) => {
    const word = wordsOf(value)[0]
    const aligned = word === 'stretch' || word === 'center' ? word : flexed(word)
    if (aligned !== undefined) {
      out.alignSelf = aligned
    }
    return undefined
  },
  'margin-block': lengths('marginTop', 'marginBottom'),
  /* How a picture fills its box: React Native's `Image` takes each of the
     web's keywords as its `objectFit`. */
  'object-fit': (out, value) => {
    const fit = String(wordsOf(value)[0])
    if (!['contain', 'cover', 'fill', 'none', 'scale-down'].includes(fit)) {
      return 'not a fit'
    }
    out.objectFit = fit
    return undefined
  },
  'place-items': (out, value) => {
    const aligned = flexed(wordsOf(value)[0])
    if (aligned !== undefined) {
      out.alignItems = aligned
    }
    return undefined
  },
  'place-self': (out, value) => {
    const aligned = flexed(wordsOf(value)[0])
    if (aligned !== undefined) {
      out.alignSelf = aligned
    }
    return undefined
  },
  'pointer-events': (out, value) => {
    /* `box-none` is a phone's way of a web rule that gives a child `auto` back:
       a phone's `none` holds for everything inside. */
    out.pointerEvents = value === 'none' || value === 'box-none' ? value : 'auto'
    return undefined
  },
  r: paintLength('r'),
  rotate: (out, value) => {
    if (value === 'none') {
      return undefined
    }
    const words = wordsOf(value)
    const turned = angle(words.at(-1))
    if (turned === undefined || (words.length > 1 && words[0] !== 'z')) {
      return 'a rotation about an axis has no native equivalent yet'
    }
    out.rotate = turned
    return undefined
  },
  scale: (out, value) => {
    if (value === 'none') {
      return undefined
    }
    const [x, y = x, z = 1] = wordsOf(value).map(factor)
    if (x === undefined || y === undefined || z !== 1) {
      return 'not one or two numbers'
    }
    out.scaleX = x
    out.scaleY = y
    return undefined
  },
  stroke: kept('stroke'),
  'stroke-dasharray': (out, value, space) => {
    if (value === 'none') {
      return undefined
    }
    /* CSS separates the dashes by spaces, commas, or both, as a loader's
       `50, 100` does. */
    const dashes = wordsOf(Array.isArray(value) ? value.flat(2) : value)
      .flatMap((word): (number | string)[] =>
        typeof word === 'number' ? [word] : word.split(',').filter((part) => part !== ''),
      )
      .map((word) => (typeof word === 'number' ? word : space(word)))
    if (dashes.some((dash) => typeof dash !== 'number')) {
      return 'not a list of lengths'
    }
    out.strokeDasharray = dashes.join(' ')
    return undefined
  },
  'stroke-dashoffset': paintLength('strokeDashoffset'),
  'stroke-linecap': kept('strokeLinecap'),
  'stroke-linejoin': kept('strokeLinejoin'),
  'stroke-opacity': kept('strokeOpacity'),
  'stroke-width': paintLength('strokeWidth'),
  transform: (out, value, space) => {
    const written = wordsOf(value).map(String).join(' ')
    const steps = parseTransform(written, (length) => space(length))
    if (steps === undefined) {
      return 'a function with no native equivalent yet'
    }
    if (steps.length > 0) {
      out.transform = writeTransform(steps)
    }
    return undefined
  },
  'transform-origin': (out, value, space) => {
    out.transformOrigin = written(value, space)
    return undefined
  },
  translate: (out, value, space) => {
    if (value === 'none') {
      return undefined
    }
    const [x, y = 0] = wordsOf(value)
    const across = space(x)
    const down = space(y)
    const moves = (by: number | string | undefined) =>
      typeof by === 'number' || (typeof by === 'string' && by.endsWith('%'))
    if (!moves(across) || !moves(down)) {
      return 'not two lengths'
    }
    out.translateX = across as number | string
    out.translateY = down as number | string
    return undefined
  },
}

/** The properties whose value may be a list, which every other property's list is not. */
export const LISTED: ReadonlySet<string> = new Set([
  'background-image',
  'box-shadow',
  'font-feature-settings',
  'stroke-dasharray',
])

/** The properties whose value may be a function, as `transform` takes `scale()`. */
export const FUNCTIONAL: ReadonlySet<string> = new Set([
  'backdrop-filter',
  'background-image',
  'clip-path',
  'transform',
])
