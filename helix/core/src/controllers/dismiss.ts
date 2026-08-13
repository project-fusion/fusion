import type { ReactiveController, ReactiveControllerHost } from 'lit'

export interface DismissOptions {
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
  private readonly onDismiss: () => void
  private active = false

  constructor(host: ReactiveControllerHost & HTMLElement, { onDismiss }: DismissOptions) {
    this.host = host
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
    // shadow root is still recognised as inside it.
    if (!event.composedPath().includes(this.host)) {
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
