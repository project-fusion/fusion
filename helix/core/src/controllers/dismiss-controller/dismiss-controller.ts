import type { ReactiveController, ReactiveControllerHost } from 'lit'

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
  boundary?: () => Element | null | undefined

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
 */
export class DismissController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement
  private readonly boundary: (() => Element | null | undefined) | undefined
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

  private readonly handlePointerDown = (event: PointerEvent): void => {
    // `composedPath` rather than `target`, so a press inside the overlay's own
    // shadow root is still recognized as inside it.
    const inside = this.boundary?.() ?? this.host
    if (!event.composedPath().includes(inside)) {
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
  }

  /** Stops listening. */
  deactivate(): void {
    if (!this.active) {
      return
    }
    this.active = false
    document.removeEventListener('keydown', this.handleKeydown)
    document.removeEventListener('pointerdown', this.handlePointerDown)
  }

  hostDisconnected(): void {
    this.deactivate()
  }
}
