/**
 * The presses a sheet's scrim takes on the web, as a phone's scrim does: a
 * press beside the sheet closes it and reaches nothing under it.
 *
 * **A popover's `::backdrop` is drawn and never pressed.** The user agent's
 * stylesheet gives it `pointer-events: none !important`, so a press on it
 * lands on the page under it, and no stylesheet can change that. The scrim is
 * listeners on the window in the capture phase instead, which hear a press
 * before anything on the page does and stop it there.
 *
 * **The whole press stops, from `pointerdown` to its `click`.** The sheet
 * closes on the `pointerdown`, so the scrim keeps listening after it has
 * closed, until the next press starts. A canceled `pointerdown` sends no
 * `mousedown`, so focus stays where it was. A `click` the keyboard sends has
 * a `detail` of 0 and passes, as it belongs to no press.
 *
 * **A press in another layer is that layer's**, as a toast's stack drawn over
 * the sheet is: an element in the top layer that does not hold the sheet's
 * host. A dialog that holds the host is under the scrim, and a press on it
 * stops.
 */

/** What makes up one press, after the `pointerdown` that starts it. */
const PRESS = [
  'auxclick',
  'click',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mouseup',
  'pointerup',
  'touchend',
  'touchstart',
] as const

export interface ScrimOptions {
  /** Whether a layer in the top layer holds the sheet's host, following slots. */
  holds: (layer: Element) => boolean

  /** Told of a press beside the sheet, which closes it. */
  onPress: () => void

  /** The sheet, which a press inside is the sheet's own. */
  surface: () => Element | null | undefined
}

/** Whether `element` is in the top layer: an open popover or a modal dialog. */
const layered = (element: Element): boolean => {
  try {
    return element.matches(':popover-open') || element.matches('dialog:modal')
  } catch {
    return false
  }
}

/** Stops the presses beside a sheet while it shows. */
export class Scrim {
  private readonly options: ScrimOptions

  /** Whether the sheet is showing. */
  private covering = false

  /** Whether the press under way started beside the sheet. */
  private pressing = false

  /** Whether the window's listeners are on. */
  private listening = false

  constructor(options: ScrimOptions) {
    this.options = options
  }

  /** Starts taking presses beside the sheet. */
  cover(): void {
    this.covering = true
    this.listen(true)
  }

  /** Stops taking new presses, once the press under way has ended. */
  uncover(): void {
    this.covering = false
    if (!this.pressing) {
      this.listen(false)
    }
  }

  private listen(on: boolean): void {
    if (on === this.listening || typeof window === 'undefined') {
      return
    }
    this.listening = on
    for (const type of ['pointerdown', ...PRESS]) {
      if (on) {
        window.addEventListener(type, this.handle, true)
      } else {
        window.removeEventListener(type, this.handle, true)
      }
    }
  }

  /** Whether a press lands beside the sheet, on the scrim. */
  private beside(event: Event): boolean {
    const surface = this.options.surface()
    const path = event.composedPath()
    if (surface && path.includes(surface)) {
      return false
    }
    return !path.some(
      (node) =>
        node instanceof Element && layered(node) && node !== surface && !this.options.holds(node),
    )
  }

  private readonly handle = (event: Event): void => {
    if (event.type === 'pointerdown') {
      this.pressing = this.covering && this.beside(event)
      if (!this.covering && !this.pressing) {
        this.listen(false)
      }
      if (!this.pressing) {
        return
      }
    } else if (!this.pressing || (event.type === 'click' && (event as MouseEvent).detail === 0)) {
      return
    }
    /* A touch is stopped and left uncanceled, as a window's `touchstart`
       listener is passive. */
    if (!event.type.startsWith('touch')) {
      event.preventDefault()
    }
    event.stopImmediatePropagation()
    if (event.type === 'pointerdown') {
      this.options.onPress()
    }
  }
}
