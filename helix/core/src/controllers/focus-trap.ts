import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Elements the platform will focus, without naming a single component.
 *
 * Custom elements are covered separately: one with `delegatesFocus` is focusable
 * as a host, and that is readable from outside through `shadowRoot`. Listing tag
 * names instead would mean a controller in `core` that only works for the
 * components `core` happens to know about.
 */
const NATIVE_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Keeps Tab inside a container while it is open, and gives focus back after.
 *
 * A dialog that does not trap focus is one a keyboard user tabs straight out
 * of, into a page they cannot see and cannot get back from. Restoring focus on
 * release matters just as much: without it, closing a drawer drops the reader
 * at the top of the document.
 */
export class FocusTrapController implements ReactiveController {
  private container: HTMLElement | null = null
  private previous: HTMLElement | null = null

  constructor(host: ReactiveControllerHost) {
    host.addController(this)
  }

  /** Everything inside the container the reader can reach with Tab. */
  private get focusable(): HTMLElement[] {
    if (!this.container) {
      return []
    }
    const found = [...this.container.querySelectorAll<HTMLElement>(NATIVE_FOCUSABLE)]
    const delegating = [...this.container.querySelectorAll<HTMLElement>('*')].filter(
      (node) => node.shadowRoot?.delegatesFocus === true,
    )
    // `getClientRects()` rather than `offsetParent`, which is null for anything
    // inside a `position: fixed` container. A drawer is exactly that, so the
    // offsetParent test excluded every control in the thing being trapped.
    return [...new Set([...found, ...delegating])].filter(
      (node) => node.getClientRects().length > 0,
    )
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.container) {
      return
    }
    const items = this.focusable
    if (items.length === 0) {
      // Nothing to move to, so keep focus where it is rather than letting Tab
      // escape into the page behind.
      event.preventDefault()
      return
    }

    const first = items[0] as HTMLElement
    const last = items.at(-1) as HTMLElement
    const active = this.deepActiveElement()

    if (event.shiftKey && (active === first || !this.container.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /** The truly focused element, following shadow roots down. */
  private deepActiveElement(): Element | null {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement
    }
    return active
  }

  /** Starts trapping, remembering where focus came from. */
  activate(container: HTMLElement): void {
    this.container = container
    this.previous = this.deepActiveElement() as HTMLElement | null
    document.addEventListener('keydown', this.handleKeydown, true)
    // After render, so the container has something to focus.
    requestAnimationFrame(() => {
      const items = this.focusable
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
