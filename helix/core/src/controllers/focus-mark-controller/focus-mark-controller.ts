import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  deepActiveElement,
  deepContains,
} from '../../utils/focusable-elements/focusable-elements.js'
import { HoverMarkController } from '../hover-mark-controller/hover-mark-controller.js'

/** What a `FocusMarkController` needs of its host. */
export interface FocusMarkOptions {
  /**
   * Told when the ring arrives on an item and when it leaves, so the host can
   * hold a state its stylesheet reads to take each item's own ring away while
   * this one draws it.
   */
  gliding: (on: boolean) => void

  /** The items focus moves among, whose own focus the ring follows. */
  items: () => readonly HTMLElement[]

  /** The ring that travels to the control with focus. */
  mark: () => HTMLElement | null | undefined

  /** The box the ring is positioned against, as `IndicatorController` takes it. */
  surface: () => HTMLElement | null | undefined

  /** Whether the ring is drawn at all, such as for a toolbar inside another that draws it. Always, left out. */
  enabled?: () => boolean
}

/**
 * Moves one focus ring to whichever item has visible focus, so a reader moving
 * along a strip with the arrow keys sees the ring travel from item to item,
 * and does not have to find where it went. Serves `Toolbar`, `Tabs`, and
 * `Toggle Group`.
 *
 * **The ring is the item's own, copied.** As it lands, it takes the focused
 * control's corners, its outline's width, and its offset, so it draws exactly
 * the ring the control would have, one inside a tab and one outside a button.
 * The host takes each item's own ring away while this one is placed, through
 * `gliding`.
 *
 * **Placed at once and seen at once.** Arriving from outside the strip, the
 * ring is placed where focus lands and is drawn at full strength in that
 * frame, since a focus ring that fades in is a moment with no focus shown;
 * `data-gliding` comes a frame later, so a stylesheet that moves it only
 * under `data-gliding` never slides it in. Only focus that shows, as
 * `:focus-visible` says, is followed: a click that focuses a control draws no
 * ring here either.
 *
 * **Within the strip only.** Focus inside an item that has left the strip's
 * box, such as a menu a toolbar button opened, takes the ring away, and the
 * items draw their own rings again.
 */
export class FocusMarkController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: FocusMarkOptions

  private readonly glide: HoverMarkController

  /** The frame the ring is next placed in. */
  private frame = 0

  constructor(host: ReactiveControllerHost & HTMLElement, options: FocusMarkOptions) {
    this.host = host
    this.options = options
    this.glide = new HoverMarkController(host, {
      gliding: options.gliding,
      mark: options.mark,
      observe: options.items,
      surface: options.surface,
    })
    host.addController(this)
  }

  hostConnected(): void {
    for (const type of EVENTS) {
      this.host.addEventListener(type, this.queue)
    }
  }

  hostDisconnected(): void {
    for (const type of EVENTS) {
      this.host.removeEventListener(type, this.queue)
    }
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
  }

  /** Places the ring a frame from now, once focus and each item's own update have settled. */
  private readonly queue = (): void => {
    if (typeof requestAnimationFrame !== 'function') {
      return
    }
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.place()
    })
  }

  /** Moves the ring to the control with visible focus, or takes it away. */
  place(): void {
    const control = this.focused()
    const mark = this.options.mark()
    if (control && mark) {
      const style = getComputedStyle(control)
      mark.style.setProperty('border-radius', style.borderRadius)
      mark.style.setProperty('outline-offset', style.outlineOffset)
      mark.style.setProperty('outline-width', style.outlineWidth)
    }
    this.glide.show(control)
  }

  /** The control inside one of the items that shows focus, inside the strip's box. */
  private focused(): HTMLElement | undefined {
    if (this.options.enabled && !this.options.enabled()) {
      return undefined
    }
    const active = deepActiveElement()
    if (!(active instanceof HTMLElement) || !active.matches(':focus-visible')) {
      return undefined
    }
    if (!this.options.items().some((item) => deepContains(item, active))) {
      return undefined
    }
    const surface = this.options.surface()
    if (!surface) {
      return undefined
    }
    /* A menu or a popover an item opened sits outside the strip, on the top
       layer, and its own rows draw their own rings. */
    const own = surface.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    const slack = 8
    const inside =
      box.left >= own.left - slack &&
      box.right <= own.right + slack &&
      box.top >= own.top - slack &&
      box.bottom <= own.bottom + slack
    return inside ? active : undefined
  }
}

/**
 * What can move the ring: focus arriving and leaving, and a key, which can
 * turn a focus the pointer made into one that shows.
 */
const EVENTS = ['focusin', 'focusout', 'keydown'] as const
