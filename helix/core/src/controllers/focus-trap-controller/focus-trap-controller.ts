import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  deepActiveElement,
  focusableElements,
} from '../../utils/focusable-elements/focusable-elements.js'

/**
 * Keeps Tab inside a container while it is open, and gives focus back after.
 *
 * A dialog that does not trap focus is one a keyboard user tabs straight out
 * of, into a page they cannot see and cannot get back from. Restoring focus on
 * release matters just as much: without it, closing a drawer drops the reader
 * at the top of the document.
 *
 * Finding the focusable elements is `focusableElements`, which is a utility
 * rather than part of this, because that half is what roving tabindex and
 * arrow-key navigation need and neither of them traps anything.
 */
export class FocusTrapController implements ReactiveController {
  private container: HTMLElement | null = null
  private previous: HTMLElement | null = null

  constructor(host: ReactiveControllerHost) {
    host.addController(this)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.container) {
      return
    }
    const items = focusableElements(this.container)
    if (items.length === 0) {
      // Nothing to move to, so keep focus where it is rather than letting Tab
      // escape into the page behind.
      event.preventDefault()
      return
    }

    const first = items[0] as HTMLElement
    const last = items.at(-1) as HTMLElement
    const active = deepActiveElement()

    if (event.shiftKey && (active === first || !this.container.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /** Starts trapping, remembering where focus came from. */
  activate(container: HTMLElement): void {
    this.container = container
    this.previous = deepActiveElement() as HTMLElement | null
    document.addEventListener('keydown', this.handleKeydown, true)
    // After render, so the container has something to focus.
    requestAnimationFrame(() => {
      const items = focusableElements(container)
      ;(items[0] ?? container).focus()
    })
  }

  /** Stops trapping and returns focus to wherever it was. */
  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeydown, true)
    this.container = null
    this.previous?.focus()
    this.previous = null
  }

  hostDisconnected(): void {
    this.deactivate()
  }
}
