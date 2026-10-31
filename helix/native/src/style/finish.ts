/**
 * Declarations as a React Native style: each property resolved and written
 * the way a view takes it, with what has no native meaning named.
 */
import { ANIMATED, motionOf, moves, time } from './animations.js'
import { apply, length, type Scale } from './apply.js'
import type { Context } from './context.js'
import { blurOf, type Clip, clipOf } from './effects.js'
import type { Family, Value } from './form.js'
import { gapped, placing } from './grid/form.js'
import { FUNCTIONAL, LISTED } from './properties.js'
import {
  clipped,
  counted,
  grid,
  line,
  markerOf,
  overflow,
  snapAlign,
  snapPadding,
  snapType,
} from './reads.js'
import { COMPARED, type Resolver } from './resolve.js'
import type {
  Counting,
  GridForm,
  Layout,
  Line,
  Motion,
  Placing,
  Resolution,
  Snap,
  Style,
  Transition,
} from './resolved.js'

/** What `finisherFor` reads about the part being drawn. */
export interface Drawing {
  readonly context: Context
  /** Where a declaration with no native meaning is named. */
  readonly dropped: string[]
  readonly family: Family
  /** Whether the part's track grows. */
  readonly grows: boolean
  /**
   * Whether the part's track is never narrower than its content, as
   * `minmax(max-content, 1fr)` is.
   */
  readonly holds: boolean
  /** Whether the part's only content is one region. */
  readonly lone: boolean
  readonly resolver: Resolver
  /** Whether the part's parent shrinks to its content. */
  readonly shrinks: boolean
  /** How the part's parent lays it out. */
  readonly within: Layout
}

/** A part's declarations, finished. */
export interface Finished {
  /** The radius of the blur behind what the part holds, where `backdrop-filter` draws one. */
  readonly blur: number | undefined
  /** The inset the part is clipped by, where `clip-path` draws one. */
  readonly clip: Clip | undefined
  readonly counting: Counting
  readonly custom: Record<string, Resolution>
  readonly gridded: GridForm | undefined
  readonly inline: boolean
  readonly marker: string | undefined
  readonly moving: Motion | undefined
  /** How much of its content the part shows, where its row is a `fit()`. */
  readonly fit: 0 | 1 | undefined
  /** Whether the part is `visibility: hidden`, which hides it from a screen reader and a press. */
  readonly invisible: boolean
  /** What the part draws with while a `visibility` transition keeps it seen, where it is hidden. */
  readonly shown: Record<string, number | string> | undefined
  readonly out: Record<string, number | string>
  readonly placement: Placing | undefined
  readonly rule: Line | undefined
  readonly scrolls: 'both' | 'x' | 'y' | undefined
  readonly snap: Snap | undefined
  readonly snapAlign: 'center' | 'end' | 'start' | undefined
  /** The color scheme what the part holds draws in, where `color-scheme` names one. */
  readonly scheme: 'dark' | 'light' | undefined
  readonly transitions: Record<string, Transition>
}

/**
 * What finishes the declarations of the part `drawing` describes. `whole` is
 * the part itself, where a track's growth and the native grid apply, and
 * `slottedWidth` is the measured width a slotted child's basis is a share of.
 */
export const finisherFor = ({
  context,
  dropped,
  family,
  grows,
  holds,
  lone,
  resolver,
  shrinks,
  within,
}: Drawing) => {
  const { resolve, resolveAcross, unsets } = resolver
  const rem = context.rem ?? 16
  const spaceRem = context.spaceRem ?? rem
  return (
    declared: Map<string, Value>,
    animation?: Map<string, Resolution>,
    whole = false,
    slottedWidth?: number,
  ): Finished => {
    const resolved = new Map<string, Resolution>()
    const transitions: Record<string, Transition> = {}
    const custom: Record<string, Resolution> = {}
    let fit: 0 | 1 | undefined
    let delay: number | undefined
    for (const [property, value] of declared) {
      /* A row that fits its content is the part's measured height. */
      if (property === 'grid-template-rows' && 'fit' in value) {
        fit = value.fit === 0 ? 0 : 1
        continue
      }
      /* A custom property set on an element is one of its hooks. */
      if (property.startsWith('--')) {
        custom[property.slice(2)] = resolve('web' in value ? value.web : value)
        continue
      }
      if ('web' in value) {
        dropped.push(`${property}: web only`)
        continue
      }
      if (unsets(value)) {
        continue
      }
      if (property === 'transition') {
        Object.assign(transitions, moves(resolve(value)))
        continue
      }
      /* **A `transition-delay` delays each move**, as a speed dial's
         actions arrive one after another. */
      if (property === 'transition-delay') {
        delay = time(resolve(value))
        continue
      }
      if ('list' in value && !LISTED.has(property)) {
        dropped.push(`${property}: no native equivalent yet`)
        continue
      }
      /* **The safe area resolves to points**, as `safeArea('top')` alone
         writes it, where a sheet's writes it inside a sum. */
      if (
        'function' in value &&
        !FUNCTIONAL.has(property) &&
        COMPARED[value.function.name] === undefined &&
        value.function.name !== 'env'
      ) {
        dropped.push(`${property}: ${value.function.name}() has no native equivalent yet`)
        continue
      }
      if (animation !== undefined && ANIMATED.has(property)) {
        animation.set(property, resolve(value))
        continue
      }
      resolved.set(
        property,
        property === 'flex-basis' ? resolveAcross(value, slottedWidth) : resolve(value),
      )
    }
    if (delay !== undefined) {
      for (const [property, move] of Object.entries(transitions)) {
        transitions[property] = { ...move, delay }
      }
    }
    const rule = line(resolved, spaceRem)
    const blur = blurOf(resolved, spaceRem)
    const clip = clipOf(resolved, spaceRem)
    const invisible = resolved.get('visibility') === 'hidden'
    const clips = clipped(resolved)
    const scrolls = overflow(resolved)
    const snaps = snapType(resolved)
    const clear = snapPadding(resolved, scrolls)
    const aligned = snapAlign(resolved)
    const schemed = resolved.get('color-scheme')
    resolved.delete('color-scheme')
    const scheme = schemed === 'light' || schemed === 'dark' ? schemed : undefined
    const counting = counted(resolved)
    const marker = markerOf(resolved, context.counters)
    const placement = placing(resolved)
    const form = grid(resolved, whole && lone)
    /* A flex box runs in a row unless it says otherwise, and a view runs in
         a column. */
    const display = resolved.get('display')
    if ((display === 'flex' || display === 'inline-flex') && !resolved.has('flex-direction')) {
      resolved.set('flex-direction', 'row')
    }
    /* **A part that sets no font size reads the one it inherits**, which
         follows the reader's text size, so an em in a line height or a letter
         spacing grows with the text too. **An em in any other length is the
         font size at the space's rem**, the size the text would be if it
         stopped where space stops, so a mark an em wide keeps to its words at
         the standard sizes and stops growing with the space after them. */
    const inherits = context.fontSize ?? rem
    const inheritsSpace = (inherits * spaceRem) / rem
    const set = resolved.get('font-size')
    const fontSize = set === undefined ? inherits : length(set, rem, inherits)
    const spaceEm = set === undefined ? inheritsSpace : length(set, spaceRem, inheritsSpace)
    const kept =
      clear === undefined
        ? 0
        : length(clear, spaceRem, typeof spaceEm === 'number' ? spaceEm : spaceRem)
    const snap: Snap | undefined =
      snaps === undefined
        ? undefined
        : { padding: typeof kept === 'number' ? kept : 0, strict: snaps === 'mandatory' }
    const out: Record<string, number | string> = {}
    /* `display` first, so a box's own alignment stands over what its kind of
         box implies. */
    const ordered = [...resolved].sort(([left], [right]) =>
      left === 'display' ? -1 : right === 'display' ? 1 : 0,
    )
    const scale: Scale = {
      fontSize: typeof fontSize === 'number' ? fontSize : inherits,
      inherits,
      rem,
      shrinks,
      spaceEm: typeof spaceEm === 'number' ? spaceEm : spaceRem,
      spaceRem,
      within,
    }
    for (const [property, value] of ordered) {
      const reason = apply(out, property, value, scale)
      if (reason !== undefined) {
        dropped.push(`${property}: ${reason}`)
      }
    }
    /* **A box whose overflow is hidden or clipped clips what it holds**, as
         a track clips its fill to its corners. */
    if (clips && scrolls === undefined) {
      out.overflow = 'hidden'
    }
    /* **A track that grows takes a share of the room left**, and gives it
         back as the line runs short, unless its least is its content: then
         it keeps its content's width, as App Header's brand does beside
         wide navigation. */
    if (grows && whole) {
      out.flexGrow = 1
      out.flexShrink = holds ? 0 : 1
      /* **On a line that wraps, the share starts from nothing**, as a
         track's does: a full width would take the line from what shares it. */
      if (within.wraps === true) {
        if (typeof out.width === 'string' && out.width.endsWith('%')) {
          delete out.width
        }
        out.flexBasis = 0
      }
    }
    /* **A negative basis is none**, as `calc()` clamps to what a property
         takes, which a switch's basis is while its row is wider. */
    if (typeof out.flexBasis === 'number' && out.flexBasis < 0) {
      out.flexBasis = 0
    }
    /* The native grid draws the gaps between its cells, inside the part. */
    const gridded = form === undefined ? undefined : gapped(form, out)
    /* A keyframe's declarations, drawn at the part's own sizes. */
    const draw = (declarations: ReadonlyMap<string, Resolution>): Style => {
      const frame: Record<string, number | string> = {}
      for (const [property, value] of declarations) {
        apply(frame, property, value, scale)
      }
      return frame
    }
    const moving = animation === undefined ? undefined : motionOf(family, animation, resolve, draw)
    const inline = resolved.get('display') === 'inline'
    /* **A hidden part is drawn seen while its `visibility` moves**, at the
         opacity it sets and taking presses, as the web keeps it. */
    const shown: Record<string, number | string> | undefined = invisible
      ? { opacity: 1 }
      : undefined
    if (shown !== undefined) {
      const opacity = resolved.get('opacity')
      if (opacity !== undefined) {
        apply(shown, 'opacity', opacity, scale)
      }
      shown.pointerEvents = resolved.get('pointer-events') === 'none' ? 'none' : 'auto'
    }
    return {
      blur,
      clip,
      counting,
      custom,
      fit,
      gridded,
      inline,
      invisible,
      marker,
      moving,
      out,
      placement,
      rule,
      scheme,
      scrolls,
      shown,
      snap,
      snapAlign: aligned,
      transitions,
    }
  }
}
