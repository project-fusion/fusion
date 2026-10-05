import type { LitElement } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixDismissEvent } from '../../events/events.js'
import {
  deepActiveElement,
  deepContains,
} from '../../utils/focusable-elements/focusable-elements.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The API a dismissible surface has, as TypeScript sees it.
 */
export declare class DismissibleElement {
  /** Whether the element shows a control that dismisses it. */
  dismissible: boolean

  /** The dismiss control's label, read by screen readers. */
  dismissLabel: string

  /** Fires `helix-dismiss`, and returns `false` if a listener cancels it. */
  dismiss(): boolean

  /** The event, built but not dispatched, for a caller that owns the timing. */
  protected dismissEvent(): HelixDismissEvent
}

/**
 * Grafts `dismissible`, its label, and the event that says so.
 *
 * **The label reads the default slot, never `this.textContent`**, which is
 * every light-DOM descendant including the ones assigned elsewhere. On
 * `Announcement` and `Tag` the two are the same thing, because they have one
 * slot. On `Toast.Item` the second sweeps in the actions: a message reading
 * "Could not reach the server" with a `Retry` button announces itself as "Could
 * not reach the server Retry", and the consumer removing it from their list
 * gets that string to match on.
 *
 * **`dismissEvent()` is separate from `dismiss()` for the one that needs it.**
 * `Announcement` and `Tag` dispatch and are done: they own no state, so a
 * refusal is the whole of the consumer's answer. `Toast.Item` holds an `open`
 * and applies the change itself, so its event goes through `requestChange` with
 * an `apply` beside it. Giving it the event rather than the method lets it keep
 * the contract and skip the default.
 */
export const MixinDismissible = <T extends Constructor<LitElement>>(Base: T) => {
  class Dismissible extends Base {
    /**
     * Whether the element shows a control that dismisses it.
     */
    @property({ reflect: true, type: Boolean })
    dismissible = false

    /**
     * The dismiss control's label, read by screen readers.
     *
     * `attribute` is spelled out because Lit lowercases a property name to
     * derive one rather than dash-casing it, so this would otherwise be
     * reachable only as `dismisslabel`, which nobody would guess and no linter
     * would catch.
     */
    @property({ attribute: 'dismiss-label' })
    dismissLabel = 'Dismiss'

    /**
     * The event, built and not dispatched.
     *
     * Reading text is safe here: nothing calls this on a server, because the
     * only things that do are a press and a timer.
     */
    protected dismissEvent(): HelixDismissEvent {
      /* Default slot only. A node assigned to a named slot belongs to another
         region and is not what this surface is called. */
      const own = [...this.childNodes]
        .filter((node) => !(node instanceof Element) || !node.slot)
        .map((node) => node.textContent ?? '')
        .join('')
      return new HelixDismissEvent({ label: own.trim() })
    }

    /** Fires `helix-dismiss`, and returns `false` if a listener cancels it. */
    dismiss(): boolean {
      const neighbors = deepContains(this, deepActiveElement()) ? this.neighbors() : []
      const event = this.dismissEvent()
      this.dispatchEvent(event)
      if (neighbors.length > 0 && !event.defaultPrevented) {
        this.keepFocus(neighbors)
      }
      return !event.defaultPrevented
    }

    /**
     * The elements of the same kind beside this one, where focus goes if this
     * one is removed: the next ones nearest first, then the previous ones
     * nearest first.
     *
     * Read before the event, while this element is still beside them.
     */
    private neighbors(): HTMLElement[] {
      const same = (node: Element | null): node is HTMLElement =>
        node instanceof HTMLElement && node.localName === this.localName
      const after: HTMLElement[] = []
      for (let node = this.nextElementSibling; node; node = node.nextElementSibling) {
        if (same(node)) {
          after.push(node)
        }
      }
      const before: HTMLElement[] = []
      for (let node = this.previousElementSibling; node; node = node.previousElementSibling) {
        if (same(node)) {
          before.push(node)
        }
      }
      return [...after, ...before]
    }

    /** Moves focus to a neighbor's dismiss control if removing this element dropped it. */
    private keepFocus(neighbors: HTMLElement[]): void {
      const settle = (): void => {
        const active = document.activeElement
        if (this.isConnected || (active !== null && active !== document.body)) {
          return
        }
        for (const neighbor of neighbors) {
          const control =
            neighbor.isConnected &&
            neighbor.shadowRoot?.querySelector<HTMLElement>('[part~="dismiss"]')
          if (control) {
            control.focus()
            return
          }
        }
      }
      settle()
      requestAnimationFrame(settle)
    }
  }

  return Dismissible as unknown as Constructor<DismissibleElement> & T
}
