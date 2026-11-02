import { environment } from '../environment/index.js'
import type { Easing, Frame, Transition } from '../types.generated.js'
import type { Motion } from './contract.generated.js'

/**
 * The curve each easing token has in `@fusion.dev/helix-styles`, for a page
 * that does not load it. `linear` has no token: it is the keyword.
 */
const SHIPPED: Readonly<Record<Exclude<Easing, 'linear'>, string>> = {
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.3, 0, 0, 1.2)',
  spring:
    'linear(0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1)',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
}

/** The CSS properties a frame draws with. */
type Property = 'height' | 'opacity' | 'translate' | 'width'

/** A value for some of the properties, as a keyframe takes them. */
type Styles = Partial<Record<Property, string>>

/** A glide on its way, and the properties it moves. */
interface Running {
  readonly animation: Animation
  readonly properties: readonly Property[]
}

/** The glide each element is in. */
const running = new WeakMap<HTMLElement, Running>()

/**
 * The curve `easing` has where `node` is: the `--helix-easing-*` token, so a
 * theme that changes the curve changes the glide with it, or the shipped curve
 * where the page sets none.
 */
const curveOf = (node: HTMLElement, easing: Easing): string =>
  easing === 'linear'
    ? 'linear'
    : getComputedStyle(node).getPropertyValue(`--helix-easing-${easing}`).trim() || SHIPPED[easing]

/** The properties `to` moves: `translate` for either of `x` and `y`. */
const propertiesOf = (to: Frame): Property[] => {
  const fields: [Property, number | undefined][] = [
    ['height', to.height],
    ['opacity', to.opacity],
    ['translate', to.x ?? to.y],
    ['width', to.width],
  ]
  return fields.filter(([, value]) => value !== undefined).map(([property]) => property)
}

/** How far a `translate` moves along each axis, in pixels. `none`, or an axis left out, is 0. */
const offsetOf = (translate: string): { x: number; y: number } => {
  const [x = 0, y = 0] = translate.split(/\s+/).map((part) => Number.parseFloat(part) || 0)
  return { x, y }
}

/**
 * The `translate` that draws `node` at `x` and `y`. An axis left out stays
 * where the node is drawn now.
 */
const translateOf = (node: HTMLElement, x: number | undefined, y: number | undefined): string => {
  const now =
    x === undefined || y === undefined
      ? offsetOf(getComputedStyle(node).getPropertyValue('translate'))
      : { x, y }
  return `${x ?? now.x}px ${y ?? now.y}px`
}

/** The styles that draw `node` at `to`. */
const stylesOf = (node: HTMLElement, to: Frame): Styles => {
  const styles: Styles = {}
  if (to.x !== undefined || to.y !== undefined) {
    styles.translate = translateOf(node, to.x, to.y)
  }
  if (to.width !== undefined) {
    styles.width = `${to.width}px`
  }
  if (to.height !== undefined) {
    styles.height = `${to.height}px`
  }
  if (to.opacity !== undefined) {
    styles.opacity = `${to.opacity}`
  }
  return styles
}

/** Writes `styles` on `node`, at once. */
const write = (node: HTMLElement, styles: Styles): void => {
  for (const [property, value] of Object.entries(styles)) {
    node.style.setProperty(property, value)
  }
}

/** The values `node` is drawn with now for `properties`, partway through a glide included. */
const drawn = (node: HTMLElement, properties: readonly Property[]): Styles => {
  const computed = getComputedStyle(node)
  return Object.fromEntries(
    properties.map((property) => [property, computed.getPropertyValue(property)]),
  )
}

/**
 * Ends the glide `node` is in without calling it back. The node keeps the
 * values the glide had drawn it with, so nothing jumps, and a glide after
 * starts from there.
 */
const halt = (node: HTMLElement): void => {
  const glide = running.get(node)
  if (!glide) {
    return
  }
  running.delete(node)
  const now = drawn(node, glide.properties)
  glide.animation.cancel()
  write(node, now)
}

const place = (node: HTMLElement, to: Frame): void => {
  halt(node)
  write(node, stylesOf(node, to))
}

/**
 * Whether a glide arrives at once: where the environment capability says the
 * reader asks for reduced motion, or where it has no length.
 */
const atOnce = (transition: Transition): boolean =>
  environment().read().reducedMotion || !(transition.duration > 0)

/**
 * Animates `node` from `from` to `to`, which its own style already holds, and
 * returns the animation, or `null` where the browser refuses it.
 */
const animate = (
  node: HTMLElement,
  from: Styles,
  to: Styles,
  transition: Transition,
): Animation | null => {
  try {
    return node.animate([from, to], {
      duration: transition.duration,
      easing: curveOf(node, transition.easing),
    })
  } catch {
    return null
  }
}

/**
 * Moves an element with its inline style and the Web Animations API: a frame
 * is a `translate` for `x` and `y`, and `width`, `height`, and `opacity`.
 *
 * **A glide writes where it ends to the inline style as it starts**, and the
 * animation runs from where the element is drawn to there, with no fill. A
 * glide that finishes leaves the element where its style says, and a glide
 * that starts partway through another starts where that one had drawn it.
 *
 * **A curve is the motion token of its name**, read where the element is, so
 * a theme's curve reaches the glide. A glide whose curve the browser cannot
 * read, such as `linear()` in an older browser, arrives at once.
 *
 * A stop, a place, or a later glide ends a glide where it had drawn the
 * element, without calling it back.
 */
export const webMotion: Motion<HTMLElement> = {
  glide: (node, to, transition, done) => {
    if (atOnce(transition)) {
      place(node, to)
      done()
      return () => undefined
    }
    const properties = propertiesOf(to)
    const from = drawn(node, properties)
    halt(node)
    const end = stylesOf(node, to)
    write(node, end)
    const animation = animate(node, from, end, transition)
    if (!animation) {
      done()
      return () => undefined
    }
    const glide: Running = { animation, properties }
    running.set(node, glide)
    animation.finished.then(
      () => {
        if (running.get(node) === glide) {
          running.delete(node)
          done()
        }
      },
      /* A canceled animation rejects `finished`, and the glide it ended owes
         no call back. */
      () => undefined,
    )
    return () => {
      if (running.get(node) === glide) {
        halt(node)
      }
    }
  },
  place,
}
