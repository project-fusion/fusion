import { boxesOf } from '../../controllers/layout-motion-controller/layout-motion-controller.js'
import { reducedMotion } from '../page-motion/page-motion.js'
import { readTiming } from '../plain-host/plain-host.js'

/** How `flashChange` lights an element. */
export interface FlashChangeOptions {
  /**
   * The wash at its strongest: a color, or a custom property that holds one.
   * Defaults to `--helix-color-info` at 14 percent in light mode and 22 in
   * dark. A translucent color lets the element's own background show through
   * it; an opaque one covers it until it fades.
   */
  color?: string | undefined
  /**
   * How long the wash takes to fade, evenly, once it has held: milliseconds,
   * a time such as `640ms`, or a custom property. Defaults to twice
   * `--helix-duration-slow`. `0` takes the wash off at once.
   */
  duration?: number | string | undefined
  /**
   * How long the wash holds at its strongest before it fades: milliseconds, a
   * time, or a custom property. Defaults to `--helix-duration-slow`.
   */
  hold?: number | string | undefined
}

/* **The info color, because it is the one tone that says "news" and keeps its
   hue in every theme.** With no brand, `primary` and `accent` are ink, and a
   wash of ink at any strength that reads is the hover (8 and 12 percent) or a
   selected row (13 and 16), so a changed row looked chosen. `warning` reads as
   a fault and turns brown on a dark page. Info at 14 percent paints
   rgb(219 233 241) on white, and at 22 paints rgb(10 36 55) on black, which
   read as one quiet step in both modes, compared side by side with the other
   tones in Chromium on November 19, 2026. The fallbacks are the info 600 and
   400, for a page with no Helix stylesheet. Data Table and Code Editor write
   the same mix as their hooks' defaults. */
const WASH =
  'light-dark(color-mix(in oklab, var(--helix-color-info, oklch(0.48 0.12 245)) 14%, transparent), color-mix(in oklab, var(--helix-color-info, oklch(0.7 0.16 245)) 22%, transparent))'

/** A flash running on one box, so a second one starts from the strength drawn. */
interface Flash {
  animation: Animation
  /** Resolves the call that started it. */
  done: () => void
  /** The strength it started from, from 0 to 1. */
  from: number
  /** When the hold ends, in milliseconds from the start. */
  held: number
  /** When the rise back to full strength ends. */
  ramped: number
  /** When the fade ends. */
  total: number
}

const flashes = new WeakMap<HTMLElement, Flash>()

/** A time in milliseconds, from a written time such as `320ms` or `0.32s`. */
const millisecondsOf = (written: string, standing: number): number => {
  const amount = Number.parseFloat(written)
  if (!Number.isFinite(amount)) {
    return standing
  }
  return written.trim().endsWith('ms') || !written.trim().endsWith('s') ? amount : amount * 1000
}

/** How strong a running flash is now, from 0 to 1, which an even rise and fade give from the time alone. */
const strengthOf = (flash: Flash): number => {
  const at = Number(flash.animation.currentTime ?? 0)
  if (at < flash.ramped) {
    return flash.from + (1 - flash.from) * (at / flash.ramped)
  }
  if (at < flash.held) {
    return 1
  }
  if (at >= flash.total) {
    return 0
  }
  return 1 - (at - flash.held) / (flash.total - flash.held)
}

/**
 * The boxes a wash is drawn on: the element, or where it draws no box of its
 * own, as a row that is `display: contents` does, what it draws. A table row
 * is washed through its cells, since a row's own shadow is not painted in
 * every browser.
 */
const boxesToWash = (element: Element): HTMLElement[] =>
  boxesOf(element).flatMap((box) =>
    getComputedStyle(box).display === 'table-row'
      ? [...box.children].filter((cell): cell is HTMLElement => cell instanceof HTMLElement)
      : [box],
  )

/** The wash at a strength, as the inset shadow that draws it. */
const washAt = (color: string, strength: number): string =>
  `inset 0 0 0 100vmax color-mix(in oklab, ${color} ${Math.round(strength * 1000) / 10}%, transparent)`

/** Lights one box, and resolves once its wash is gone. */
const flashBox = (
  box: HTMLElement,
  color: string,
  timing: { fade: number; hold: number; ramp: number },
  reduced: boolean,
): Promise<void> =>
  new Promise<void>((resolve) => {
    const running = flashes.get(box)
    const from = running && !reduced ? strengthOf(running) : 0
    if (running) {
      running.animation.cancel()
      running.done()
    }
    const ramped = from > 0 ? timing.ramp * (1 - from) : 0
    const held = ramped + timing.hold
    const total = held + timing.fade
    if (total < 1) {
      flashes.delete(box)
      resolve()
      return
    }
    const keyframes: Keyframe[] = []
    if (ramped > 0) {
      keyframes.push({ boxShadow: washAt(color, from), offset: 0 })
    }
    keyframes.push(
      { boxShadow: washAt(color, 1), offset: ramped / total },
      { boxShadow: washAt(color, 1), offset: held / total },
      { boxShadow: washAt(color, 0), offset: 1 },
    )
    /* Added to the box's own shadows, so a focus ring or an edge drawn with
       one stays where it is, and the box's background is never written. */
    const animation = box.animate(keyframes, { composite: 'add', duration: total })
    const flash: Flash = { animation, done: resolve, from, held, ramped, total }
    flashes.set(box, flash)
    const finish = (): void => {
      if (flashes.get(box) === flash) {
        flashes.delete(box)
        resolve()
      }
    }
    /* Settled whether it ends or is canceled, and owned by the animation, so
       nothing is left listening on a box that leaves the page. */
    animation.finished.then(finish, finish)
  })

/**
 * Lights an element up with a quiet wash and fades it out, so you see what
 * changed when live data or an agent changes it, and resolves once the wash is
 * gone.
 *
 * ```js
 * import { flashChange } from '@fusion.dev/helix-core'
 *
 * cell.textContent = '1,284'
 * flashChange(cell)
 * ```
 *
 * **The wash is drawn over the element's background and under its content**,
 * as an inset shadow added to the element's own shadows, so nothing moves and
 * the element's own background, shadows, and focus ring are as they were once
 * it ends. It works on a line of text that wraps, on a table cell, and on a
 * row: a row that draws no box of its own, such as a `<tr>` or a
 * `display: contents` row, is washed through its cells.
 *
 * **A second flash on the same element starts from the strength drawn**, rises
 * back to full over `--helix-duration-fast`, and holds and fades again, so a
 * value that keeps changing stays lit and never doubles up. The first call
 * resolves then.
 *
 * **Under reduced motion the wash still shows**, since it shows what changed:
 * it holds at full strength, with no rise, and goes over
 * `--helix-duration-fade`, the crossfade Helix keeps for that setting. The
 * hold keeps its usual length there, though the stylesheet shortens
 * `--helix-duration-slow` to almost nothing.
 *
 * Announce the change some other way as well, such as in a live region, for a
 * reader who does not see the wash.
 */
export const flashChange = (element: Element, options: FlashChangeOptions = {}): Promise<void> => {
  if (!element.isConnected) {
    return Promise.resolve()
  }
  const boxes = boxesToWash(element).filter((box) => typeof box.animate === 'function')
  if (boxes.length === 0) {
    return Promise.resolve()
  }
  const reduced = reducedMotion()
  const written = options.color ?? WASH
  const color = written.startsWith('--') ? `var(${written})` : written
  const slow = millisecondsOf(readTiming(element, undefined, '--helix-duration-slow', '320ms'), 320)
  /* Under reduced motion the stylesheet takes `slow` to 0.01ms, which is about
     movement; the wash is not movement, so its hold keeps the usual length. */
  const usual = reduced && slow < 1 ? 320 : slow
  const hold =
    options.hold === undefined
      ? usual
      : millisecondsOf(readTiming(element, options.hold, '--helix-duration-slow', '320ms'), usual)
  const asked =
    options.duration === undefined
      ? usual * 2
      : millisecondsOf(
          readTiming(element, options.duration, '--helix-duration-slow', '320ms'),
          usual * 2,
        )
  const fade = reduced
    ? Math.min(
        asked,
        millisecondsOf(readTiming(element, undefined, '--helix-duration-fade', '120ms'), 120),
      )
    : asked
  const ramp = millisecondsOf(readTiming(element, undefined, '--helix-duration-fast', '120ms'), 120)
  return Promise.all(boxes.map((box) => flashBox(box, color, { fade, hold, ramp }, reduced))).then(
    () => undefined,
  )
}
