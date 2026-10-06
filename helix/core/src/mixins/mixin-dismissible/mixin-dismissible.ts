import type { LitElement } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixDismissEvent } from '../../events/events.js'
import {
  deepActiveElement,
  deepContains,
} from '../../utils/focusable-elements/focusable-elements.js'
import { tabStops } from '../../utils/tab-stops/tab-stops.js'

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

  /** Where focus lands when a neighbor that held it is removed: the dismiss control. */
  protected get returnFocusTo(): HTMLElement | null
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

    /**
     * Where focus lands when a neighbor that held it is removed: this
     * element's dismiss control.
     *
     * A seam for a member whose focus lives elsewhere: a tag in a Tag Group is
     * a row the arrows move between, so a removed row hands focus to the next
     * row rather than to its remove button.
     */
    protected get returnFocusTo(): HTMLElement | null {
      return this.shadowRoot?.querySelector<HTMLElement>('[part~="dismiss"]') ?? null
    }

    /** Fires `helix-dismiss`, and returns `false` if a listener cancels it. */
    dismiss(): boolean {
      const inside = deepContains(this, deepActiveElement())
      const neighbors = inside ? this.neighbors() : []
      const beside = inside && neighbors.length === 0 ? this.stopBeside() : undefined
      const event = this.dismissEvent()
      this.dispatchEvent(event)
      if ((neighbors.length > 0 || beside) && !event.defaultPrevented) {
        this.keepFocus(neighbors, beside)
      }
      return !event.defaultPrevented
    }

    /**
     * The tab stop after this element on the page, or the one before it at the
     * end, for a lone element whose removal would drop focus to the body.
     *
     * **A lone Callout or Announcement had nowhere to hand focus**, so a
     * keyboard reader who dismissed one started again from the top of the
     * page. React Aria's Toast hands focus on the same way. Read before the
     * event, in the order Tab reaches the stops, while this element's own are
     * still among them.
     */
    private stopBeside(): HTMLElement | undefined {
      const stops = tabStops(document.body)
      const own = stops.flatMap((stop, at) => (deepContains(this, stop) ? [at] : []))
      const first = own[0]
      const last = own.at(-1)
      if (first === undefined || last === undefined) {
        return undefined
      }
      return stops[last + 1] ?? stops[first - 1]
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

    /**
     * Moves focus to a neighbor's dismiss control if removing this element
     * dropped it, or, with no neighbor, to the tab stop beside where it was.
     *
     * **The tab stop beside waits a frame.** A container that owns its
     * members' focus settles it in a microtask after the event: a Tag Group
     * whose last tag goes focuses its `empty` part. Handed on at once, focus
     * left the group before the group could look, and its reader never heard
     * that the set was empty. A neighbor of the same kind is still taken at
     * once, because no container puts focus anywhere better.
     */
    private keepFocus(neighbors: HTMLElement[], beside?: HTMLElement): void {
      this.forgetFocus?.()
      const settle = (late: boolean): void => {
        const active = document.activeElement
        if (this.isConnected || (active !== null && active !== document.body)) {
          return
        }
        for (const neighbor of neighbors) {
          /* The neighbor is this element's own kind, so it has the seam. */
          const control = neighbor.isConnected && (neighbor as unknown as Dismissible).returnFocusTo
          if (control) {
            control.focus()
            /* A control that cannot take focus, such as a disabled button,
               passes the turn to the next neighbor. */
            if (deepContains(neighbor, deepActiveElement())) {
              return
            }
          }
        }
        if (late && beside?.isConnected) {
          beside.focus()
        }
      }
      settle(false)
      requestAnimationFrame(() => settle(true))
      /* **And again when it leaves, where that is later.** A page that plays
         an exit animation removes the element after it, more than a frame on,
         and focus dropped to the body. The hand-off waits for the element to
         go, until focus moves anywhere first. */
      if (this.isConnected) {
        const forget = (): void => {
          this.handOff = undefined
          this.forgetFocus = undefined
          document.removeEventListener('focusin', forget, true)
        }
        this.handOff = settle
        this.forgetFocus = forget
        document.addEventListener('focusin', forget, true)
      }
    }

    /** The hand-off waiting for this element to leave, if one is. */
    private handOff: ((late: boolean) => void) | undefined = undefined

    /** Stops waiting for the hand-off, once focus has moved anywhere. */
    private forgetFocus: (() => void) | undefined = undefined

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      const settle = this.handOff
      if (settle) {
        this.forgetFocus?.()
        requestAnimationFrame(() => settle(true))
      }
    }
  }

  return Dismissible as unknown as Constructor<DismissibleElement> & T
}
