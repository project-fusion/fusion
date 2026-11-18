import { IndicatorController } from '../../controllers/indicator-controller/indicator-controller.js'
import { runOn } from '../plain-host/plain-host.js'

/** What `trackIndicator` marks, and with what. */
export interface TrackIndicatorOptions {
  /**
   * The item marked now: a selector matched inside the element, such as
   * `[aria-current="page"]`, or a function that returns it. Nothing matching
   * takes the mark away.
   */
  active: string | (() => HTMLElement | null | undefined)
  /** The mark, an absolutely positioned element inside the element, that travels to the item. */
  indicator: HTMLElement
  /**
   * The box the mark is positioned against, which has to be its containing
   * block. Defaults to the mark's `offsetParent`, which is that box, or else
   * the element.
   */
  surface?: HTMLElement | undefined
}

/** A mark tracking an item, and the two things a page does with it. */
export interface TrackedIndicator {
  /** Measures again, for a change the element cannot see, such as one to a style sheet. */
  place(): void
  /** Stops tracking. The mark keeps the place it was last given. */
  stop(): void
}

/**
 * Sends one mark from item to item as the marked item changes, as a Helix
 * `Tabs` moves its underline, inside any element.
 *
 * ```js
 * import { trackIndicator } from '@fusion.dev/helix-core'
 *
 * trackIndicator(document.querySelector('nav'), {
 *   active: '[aria-current="page"]',
 *   indicator: document.querySelector('nav .mark'),
 * })
 * ```
 *
 * ```css
 * nav { position: relative; }
 * nav .mark {
 *   position: absolute;
 *   inset-block-start: 0;
 *   inset-inline-start: 0;
 *   inline-size: var(--indicator-inline-size, 0);
 *   block-size: var(--indicator-block-size, 0);
 *   translate: var(--indicator-x, 0) var(--indicator-y, 0);
 *   opacity: 0;
 *   transition:
 *     translate var(--helix-duration-normal) var(--helix-easing-emphasized),
 *     inline-size var(--helix-duration-normal) var(--helix-easing-emphasized),
 *     opacity var(--helix-duration-fast);
 * }
 * nav .mark[data-placed] { opacity: 1; }
 * ```
 *
 * **The mark is written four custom properties**, `--indicator-x`,
 * `--indicator-y`, `--indicator-inline-size` and `--indicator-block-size`, in
 * the surface's own pixels, signed along the inline axis on a right-to-left
 * page. The stylesheet moves it, so its transition is the move, and reduced
 * motion is whatever the stylesheet says for it. `data-placed` is on the mark
 * once it has a place, and `data-moving` while it travels to a new one.
 *
 * **The element is watched**: a change to an attribute inside it, such as
 * `aria-current` moving to another link, an item added or taken away, or a
 * change in its size places the mark again. An item still sliding into place
 * is measured once it comes to rest.
 */
export const trackIndicator = (
  element: HTMLElement,
  options: TrackIndicatorOptions,
): TrackedIndicator => {
  const { active, indicator } = options
  const pick =
    typeof active === 'function' ? active : () => element.querySelector<HTMLElement>(active)
  const running = runOn(
    element,
    (host) =>
      new IndicatorController(host, {
        active: pick,
        indicator: () => indicator,
        observe: () => [...element.children].filter((one) => one !== indicator),
        surface: () =>
          options.surface ??
          (indicator.offsetParent instanceof HTMLElement ? indicator.offsetParent : element),
      }),
  )
  /* What the mark itself changes is no change to the items: it writes its own
     style and attributes on every placement. */
  const mutations = new MutationObserver((records) => {
    if (records.some((one) => one.target !== indicator && !indicator.contains(one.target))) {
      running.controller.place()
    }
  })
  mutations.observe(element, { attributes: true, childList: true, subtree: true })
  running.controller.place()
  return {
    place: () => running.controller.place(),
    stop: () => {
      mutations.disconnect()
      running.release()
    },
  }
}
