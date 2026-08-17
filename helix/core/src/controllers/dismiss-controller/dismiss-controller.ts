import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * The element that actually has focus, through any number of shadow roots.
 *
 * `document.activeElement` stops at the outermost host: focus inside a shadow
 * tree is reported as the element containing that tree, because what is inside
 * it is not the document's business. So a frame in a component's shadow root
 * reads as the component, and a check for a frame never matches one. Each root
 * keeps its own `activeElement`, so descending through them gives the element
 * the reader is really on.
 */
const deepActiveElement = (): Element | null => {
  let element = document.activeElement
  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement
  }
  return element
}

export interface DismissOptions {
  /**
   * The element a press must land inside to count as interacting rather than
   * leaving. Defaults to the host.
   *
   * It has to be overridable because an overlay's own scrim is usually inside
   * its shadow root, and a press on the scrim is exactly what "outside" means
   * to a reader. Measured against the host, that press is inside the composed
   * path and the overlay never closes. A drawer points this at its panel.
   */
  boundary?: () => Element | readonly (Element | null | undefined)[] | null | undefined

  /** Called when the reader asks to close. */
  onDismiss: () => void
}

/**
 * Closes an overlay on Escape or on a pointer press outside it.
 *
 * Both, because they are different intentions with the same meaning: Escape is
 * the keyboard's way out and clicking away is the pointer's, and an overlay
 * that honours only one is one half its readers cannot dismiss.
 *
 * The outside press is watched on `pointerdown` rather than `click`, so a press
 * that starts outside and drags across the overlay still counts as leaving
 * rather than as interacting.
 *
 * A press inside a frame is the third case, and it needs its own signal. The
 * frame swallows the event, so the document that owns the overlay never sees a
 * `pointerdown` at all, and where the frame is cross-origin there is nothing to
 * listen to inside it either. What is observable is that the window lost focus
 * and a frame on this page gained it, which is exactly a press the document
 * cannot see. Leaving the browser altogether blurs the window too, so what took
 * focus is the part that distinguishes them.
 */
export class DismissController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement
  private readonly boundary:
    | (() => Element | readonly (Element | null | undefined)[] | null | undefined)
    | undefined
  private readonly onDismiss: () => void
  private active = false

  constructor(host: ReactiveControllerHost & HTMLElement, { boundary, onDismiss }: DismissOptions) {
    this.host = host
    this.boundary = boundary
    this.onDismiss = onDismiss
    host.addController(this)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      // Stops the same press from also closing whatever is behind: the
      // innermost overlay is the one the reader meant.
      event.stopPropagation()
      this.onDismiss()
    }
  }

  /**
   * Focus left the document. If a frame took it, that was a press.
   *
   * Deferred by a task, because the order of `blur` against the focus moving is
   * not something every browser agrees on and reading `activeElement` too early
   * gives the element that is losing focus rather than the one taking it. The
   * guard is for the case where the overlay closed for another reason in
   * between, which would otherwise dismiss whatever opened next.
   */
  private readonly handleWindowBlur = (): void => {
    setTimeout(() => {
      if (this.active && deepActiveElement()?.tagName === 'IFRAME') {
        this.onDismiss()
      }
    })
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    // `composedPath` rather than `target`, so a press inside the overlay's own
    // shadow root is still recognized as inside it.
    /* More than one thing can be inside.
     *
     * A control is not always one element: a popover opened by an invoker
     * somewhere else on the page has that invoker as part of it, and a press on
     * it is not a press outside. Treating it as outside closed the panel on
     * `pointerdown` and the invoker's own `--toggle` reopened it on the `click`
     * that followed, so the panel could never be closed by the button that
     * opened it. */
    const inside = this.boundary?.() ?? this.host
    const boundaries = (Array.isArray(inside) ? inside : [inside]).filter(Boolean) as Element[]
    const path = event.composedPath()
    if (!boundaries.some((element) => path.includes(element))) {
      this.onDismiss()
    }
  }

  /** Starts listening. */
  activate(): void {
    if (this.active) {
      return
    }
    this.active = true
    document.addEventListener('keydown', this.handleKeydown)
    document.addEventListener('pointerdown', this.handlePointerDown)
    window.addEventListener('blur', this.handleWindowBlur)
  }

  /** Stops listening. */
  deactivate(): void {
    if (!this.active) {
      return
    }
    this.active = false
    document.removeEventListener('keydown', this.handleKeydown)
    document.removeEventListener('pointerdown', this.handlePointerDown)
    window.removeEventListener('blur', this.handleWindowBlur)
  }

  hostDisconnected(): void {
    this.deactivate()
  }
}
