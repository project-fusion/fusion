import { CountController } from '../../controllers/count-controller/count-controller.js'
import { type Running, readTiming, runOn } from '../plain-host/plain-host.js'

/** How `countTo` counts. */
export interface CountToOptions {
  /**
   * The number to count from. Defaults to the number the element was last
   * counted to, or else the number its text reads as, which a figure written
   * with grouping in another language may not: pass it the first time there.
   */
  from?: number | undefined
  /**
   * How long the count takes: milliseconds, a time such as `800ms`, or a
   * custom property. Defaults to `--helix-duration-slow`. `0` writes the new
   * figure at once.
   */
  duration?: number | string | undefined
  /** The curve the count follows, or a custom property. Defaults to `--helix-easing-decelerate`, which slows as it arrives. */
  easing?: string | undefined
  /** Writes a figure as text. Defaults to the number written in the element's language. */
  format?: ((value: number) => string) | undefined
}

/** A count running over an element, so a second one carries on from the figure drawn. */
interface Count {
  running: Running<CountController>
  /** The latest call's, which the controller reads when a count starts. */
  options: CountToOptions
  to: number
  done: () => void
}

const counts = new WeakMap<HTMLElement, Count>()

/** Where each element was last counted to. */
const reached = new WeakMap<HTMLElement, number>()

/** The number an element's text reads as, with its grouping taken out. */
const readNumber = (element: HTMLElement): number => {
  const text = (element.textContent ?? '').replace(/[^\d.-]/g, '')
  const value = Number.parseFloat(text)
  return Number.isFinite(value) ? value : 0
}

/** Writes a figure in the element's language, or the page's where that is no language. */
const formatterOf = (element: HTMLElement): ((value: number) => string) => {
  const language = element.closest('[lang]')?.getAttribute('lang') || undefined
  try {
    return new Intl.NumberFormat(language).format
  } catch {
    return new Intl.NumberFormat().format
  }
}

/**
 * Counts the figure an element shows to a new number, once a frame, as a
 * Helix `Stat` counts, and resolves once the new figure is written.
 *
 * ```js
 * import { countTo } from '@fusion.dev/helix-core'
 *
 * await countTo(document.querySelector('#revenue'), 1284)
 * ```
 *
 * **The element's text is the figure**, so it holds nothing else. Each frame
 * is rounded to as many decimals as the two numbers have, so a count to 1,284
 * shows no fractions. A count started while another runs carries on from the
 * figure drawn, and the first one resolves then.
 *
 * **Not in a live region.** The text changes every frame, which a live region
 * would read out each time; announce the new number some other way.
 *
 * Under reduced motion, or with no time to take, the new figure is written at
 * once.
 */
export const countTo = (
  element: HTMLElement,
  to: number,
  options: CountToOptions = {},
): Promise<void> =>
  new Promise<void>((resolve) => {
    const from = options.from ?? reached.get(element) ?? readNumber(element)
    const write = (count: Count, value: number): void => {
      element.textContent = (count.options.format ?? formatterOf(element))(value)
    }
    const finish = (count: Count): void => {
      counts.delete(element)
      reached.set(element, count.to)
      write(count, count.to)
      count.running.release()
      count.done()
    }
    let count = counts.get(element)
    if (count) {
      /* The same controller, so it starts from the figure it is drawing, and
         the count it takes over resolves now. */
      count.done()
      Object.assign(count, { done: resolve, options, to })
    } else {
      let made: Count | undefined
      const running = runOn(
        element,
        (host) =>
          new CountController(host, {
            timing: () => ({
              duration: readTiming(
                element,
                made?.options.duration,
                '--helix-duration-slow',
                '320ms',
              ),
              easing: readTiming(
                element,
                made?.options.easing,
                '--helix-easing-decelerate',
                'cubic-bezier(0, 0, 0, 1)',
              ),
            }),
          }),
        () => {
          if (!made) {
            return
          }
          const figure = made.running.controller.counting
          if (figure === undefined) {
            finish(made)
          } else {
            write(made, figure)
          }
        },
      )
      made = { done: resolve, options, running, to }
      count = made
    }
    counts.set(element, count)
    count.running.controller.start(from, to)
    if (count.running.controller.counting === undefined) {
      finish(count)
    }
  })
