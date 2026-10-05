import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  deepActiveElement,
  deepContains,
  focusableElements,
} from '../../utils/focusable-elements/focusable-elements.js'

export interface FocusScopeOptions {
  /**
   * The elements whose controls are inside the scope, in order. For a surface
   * that holds a slot, these are the elements assigned to it: a query on the
   * surface stops at the slot and never reaches them.
   */
  contents: () => readonly Element[]

  /** Whether `Tab` is kept inside the scope, wrapping at either end. */
  contain?: () => boolean

  /**
   * Where focus goes on the way in: the first control inside, or the surface
   * itself. The first control unless said, falling back to the surface where
   * there is none.
   */
  start?: 'first' | 'surface'

  /** The box focus is kept in, which takes focus itself where nothing inside can. */
  surface: () => HTMLElement | null | undefined
}

/** Whether an element can take focus itself, by the same test `focusableElements` makes. */
const takesFocus = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement &&
  (element.matches(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])',
  ) ||
    element.shadowRoot?.delegatesFocus === true)

/** The controls among some elements and inside them, in order. */
export const controlsIn = (elements: readonly Element[]): HTMLElement[] =>
  elements.flatMap((one) => [
    ...(takesFocus(one) ? [one] : []),
    ...(one instanceof HTMLElement ? focusableElements(one) : []),
  ])

/**
 * Moves focus into a surface and back out of it, and can keep `Tab` inside
 * while it is open.
 *
 * The part of an overlay that is about focus and nothing else: a popover that
 * moves focus in as it opens, a modal popover that keeps it there, a toast
 * region a hotkey takes focus to. Each of them decides *when*; this does the
 * moving, and remembers where focus came from so `leave` can give it back.
 *
 * **Back only from inside.** A surface closed by a press somewhere else has not
 * taken focus with it, and pulling focus back would move a reader who had
 * already gone where they meant to.
 */
export class FocusScopeController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: FocusScopeOptions

  /** Where focus was when it was moved in. */
  private origin: HTMLElement | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: FocusScopeOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleKeydown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleKeydown)
  }

  /** Whether focus is in the surface or anything assigned into it. */
  get holdsFocus(): boolean {
    const active = deepActiveElement()
    const surface = this.options.surface()
    return (
      active !== null &&
      ((surface !== null && surface !== undefined && deepContains(surface, active)) ||
        this.options.contents().some((one) => deepContains(one, active)))
    )
  }

  /** The controls inside the scope, in order. */
  get controls(): HTMLElement[] {
    return controlsIn(this.options.contents())
  }

  /** Moves focus into the scope, and remembers where it was. */
  enter(): void {
    const active = deepActiveElement()
    if (active instanceof HTMLElement && !this.holdsFocus) {
      this.origin = active
    }
    const first = this.options.start === 'surface' ? undefined : this.controls[0]
    ;(first ?? this.options.surface())?.focus({ preventScroll: true })
  }

  /**
   * Gives focus back to where it was before `enter`, if focus is still inside
   * the scope. Returns whether it did.
   */
  leave(): boolean {
    const origin = this.origin
    this.origin = undefined
    if (!origin?.isConnected || !this.holdsFocus) {
      return false
    }
    origin.focus({ preventScroll: true })
    return true
  }

  /** `Tab` at either end wraps to the other, while the scope is containing. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.defaultPrevented || !this.options.contain?.()) {
      return
    }
    const controls = this.controls
    const active = deepActiveElement()
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first || !last) {
      event.preventDefault()
      this.options.surface()?.focus({ preventScroll: true })
      return
    }
    const at = (control: HTMLElement): boolean => active !== null && deepContains(control, active)
    if (event.shiftKey && (at(first) || active === this.options.surface())) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && at(last)) {
      event.preventDefault()
      first.focus()
    }
  }
}
