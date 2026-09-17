import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixElement } from '../../helix-element/helix-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The API a collection has for the two states that are not its content.
 */
export declare class CollectionElement {
  /** Whether the rows are still on their way. */
  loading: boolean

  /** What is said while they are. */
  loadingText: string

  /** What is said where there are none and none are coming. */
  emptyText: string

  /**
   * The status line, or nothing where the collection has content to show.
   *
   * Rendered by the component wherever its rows would be.
   */
  protected renderStatus(hasContent: boolean): TemplateResult | typeof nothing

  /** Binds to a rows slot's `slotchange`, and answers `hasRows` from it. */
  protected countRows(event: Event): void

  /** What the rows slot is given, read from the host so a first render has it. */
  protected get slotted(): Element[]

  /**
   * Whether there is anything to show, as far as anything can tell.
   *
   * True until the rows have been counted, which is what keeps a server from
   * claiming a list is empty.
   */
  protected get hasRows(): boolean
}

/**
 * Grafts the two states a collection has that are not its content.
 *
 * **Empty and loading are different answers and a reader can tell them apart.**
 * "No results" under a spinner is a lie for as long as the request is in
 * flight, and a blank box is not an answer at all: a reader cannot know whether
 * a list is empty, still arriving, or broken.
 *
 * **`aria-busy` on the collection, not on the message.** A reader with a screen
 * reader is told the region is changing and then told once, politely, what it
 * settled on: a live region that fires on every intermediate state is a reader
 * being read a progress bar.
 *
 * **The status replaces the rows rather than sitting above them.** A list that
 * shows "Loading" over the last request's results is a list that lies about
 * which question it is answering, and this is the point in a component's life
 * when a consumer is most likely to be looking at stale content.
 *
 * **`empty` and `loading` are documented on each of the five families that
 * apply this, rather than here.** See `MixinField` for why a class-level tag on
 * a mixin reaches no manifest.
 */
export const MixinCollection = <T extends Constructor<HelixElement>>(Base: T) => {
  class Collection extends Base {
    /**
     * What is said where there are none, and none are coming.
     */
    @property({ attribute: 'empty-text' })
    emptyText = 'Nothing to show'

    /**
     * Whether the rows are still on their way.
     *
     * Reflected, because a stylesheet needs it: the rows that are already there
     * are dimmed rather than removed while a new set arrives, and only CSS can
     * say that without the component knowing what a row looks like.
     */
    @property({ reflect: true, type: Boolean })
    loading = false

    /**
     * What is said while they are on their way.
     */
    @property({ attribute: 'loading-text' })
    loadingText = 'Loading'

    /**
     * Whether the rows have been looked at yet.
     */
    @state()
    private slotCounted = false

    /**
     * How many there were, the last time anyone looked.
     *
     * **Never name this `rows`.** TypeScript's `private` is a compile-time
     * claim and the runtime field is whatever it is named, so a subclass
     * declaring `@property() rows` for the data a consumer hands it would share
     * one field with this counter: the slot count would overwrite the
     * consumer's array on every update, and `hasRows` would read the array's
     * length as a slot count. Nothing would throw. `helix-data-table` takes
     * exactly that property.
     */
    @state()
    private slotRows = 0

    /**
     * Counts what a rows slot was given.
     *
     * Emptiness is a fact about light DOM children and the server has none to
     * count. `slotchange` never fires there, so `counted` is false exactly when
     * the answer is unknown, and an unknown answer is not "empty": a list that
     * shipped "Nothing to show" over markup about to have rows in it is the one
     * thing an empty state must never do.
     */
    protected countRows(event: Event): void {
      this.slotCounted = true
      this.slotRows = (event.target as HTMLSlotElement).assignedElements().length
    }

    protected get hasRows(): boolean {
      return this.slotCounted ? this.slotRows > 0 : true
    }

    /**
     * What the rows slot is given: every child without a `slot`.
     *
     * The default slot, because that is where every collection in this library
     * puts its rows: Listbox its options, Tree its items, Table its rows, Menu
     * and Drilldown their pages. A named slot is a header or a footer, and
     * neither is content.
     *
     * **The host's children rather than the slot's assigned elements**, which
     * are the same elements, because a slot exists only once a render has made
     * it and the count is wanted by the first render. A collection that assigns
     * its slots by hand says what it assigns.
     */
    protected get slotted(): Element[] {
      return [...(this.children ?? [])].filter((child) => child.slot === '')
    }

    /**
     * Counts the rows before every render.
     *
     * `slotchange` alone is not enough, and the gap is exactly the case this
     * mixin exists for: the event fires when an assignment *changes*, and a
     * collection that arrives with nothing in it has no change to report. So a
     * list that was empty from the start never learned it was empty and said
     * nothing at all, which is the blank box a reader cannot tell from a broken
     * one. Measured on Table, whose rows slot starts empty.
     *
     * Not on the server, whose element shim carries attributes and no tree, so
     * `children` is undefined there and `slotCounted` stays false exactly when
     * the answer is unknown. Asked of the element rather than of `isServer`,
     * which is true in any test runner that resolves Lit's `node` build. And not
     * while hydrating what a server sent, which has to render the same unknown.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      if (!this.childrenKnown) {
        return
      }
      const rows = this.slotted.length
      this.slotCounted = true
      if (rows !== this.slotRows) {
        this.slotRows = rows
      }
    }

    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      this.finishHydration()
    }

    /**
     * The status line, or nothing where there is content to show.
     *
     * Loading wins over empty. A collection that has not answered yet is not
     * empty, and saying so is the most common version of this fault: the reader
     * is told there is nothing a moment before there is something.
     */
    protected renderStatus(hasContent: boolean): TemplateResult | typeof nothing {
      if (this.loading) {
        return html`<p part="loading" role="status">${this.loadingText}</p>`
      }
      if (hasContent) {
        return nothing
      }
      return html`<p part="empty">${this.emptyText}</p>`
    }
  }

  return Collection as unknown as Constructor<CollectionElement> & T
}
