import { property } from 'lit/decorators.js'
import type { HelixElement } from '../helix-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** Detail carried by the `open-change` event. */
export interface OpenChangeDetail {
  open: boolean
}

/**
 * The public surface `WithOpen` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class WithOpenInterface {
  /**
   * Initial open state for uncontrolled use. Ignored once `open` is set.
   */
  defaultOpen: boolean

  /**
   * The resolved open state, whichever mode the element is in.
   */
  readonly isOpen: boolean

  /**
   * Whether the element is open. Setting this puts the element into controlled
   * mode: the consumer owns the value from that point on.
   */
  open: boolean | undefined

  /**
   * Requests an open-state change. In uncontrolled mode the element updates
   * itself; in controlled mode it only notifies and waits for the consumer.
   */
  setOpen(next: boolean): void
}

/**
 * Grafts controlled and uncontrolled open state onto a base class.
 *
 * Controlled mode is detected automatically: once a consumer sets `open`
 * explicitly, the element stops managing the value itself and only emits
 * `open-change`. Uncontrolled consumers set `defaultOpen` and let the element
 * own it.
 *
 * The kebab-case `open-change` event maps to an `onOpenChange` React prop
 * through the wrapper generator, so the event name is public API.
 */
export const WithOpen = <T extends Constructor<HelixElement>>(Base: T) => {
  class OpenElement extends Base {
    @property({ reflect: true, type: Boolean })
    open: boolean | undefined = undefined

    @property({ attribute: 'default-open', type: Boolean })
    defaultOpen = false

    private internalOpen = false

    get isOpen(): boolean {
      return this.isControlled ? (this.open ?? false) : this.internalOpen
    }

    private get isControlled(): boolean {
      return this.open !== undefined
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.internalOpen = this.defaultOpen
    }

    setOpen(next: boolean): void {
      if (this.isOpen === next) {
        return
      }
      if (!this.isControlled) {
        this.internalOpen = next
        this.requestUpdate()
      }
      this.emit<OpenChangeDetail>('open-change', { open: next })
    }
  }

  return OpenElement as Constructor<WithOpenInterface> & T
}
