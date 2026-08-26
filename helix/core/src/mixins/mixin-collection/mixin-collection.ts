import { html, type LitElement, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * a list is empty, still arriving, or broken. Six components each rendered rows
 * and none of them said either thing, so every consumer wrote their own and
 * wrote it differently.
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
 * Listbox had `empty-text` and nothing else, and Combobox forwarded it. Both
 * keep the name, so nothing a consumer wrote has moved.
 *
 *
 * **`empty` and `loading` are documented on each of the five families that
 * apply this, rather than here.** See `MixinField` for why a class-level tag on
 * a mixin reaches no manifest.
 */
export const MixinCollection = <T extends Constructor<LitElement>>(Base: T) => {
  class Collection extends Base {
    /**
     * Whether the rows are still on their way.
     *
     * Reflected, because a stylesheet needs it: the rows that are already there
     * are dimmed rather than removed while a new set arrives, and only CSS can
     * say that without the component knowing what a row looks like.
     */
    @property({ reflect: true, type: Boolean })
    loading = false

    /** What is said while they are on their way. */
    @property({ attribute: 'loading-text' })
    loadingText = 'Loading'

    /** What is said where there are none, and none are coming. */
    @property({ attribute: 'empty-text' })
    emptyText = 'Nothing to show'

    /** Whether the rows have been looked at yet. */
    @state()
    private slotCounted = false

    /**
     * How many there were, the last time anyone looked.
     *
     * **Not `rows`, and the rename is the whole point of this comment.**
     * TypeScript's `private` is a compile-time claim and the runtime field is
     * whatever it is named, so a subclass declaring `@property() rows` for the
     * data a consumer hands it would share one field with this counter: the
     * slot count would overwrite the consumer's array on every `updated`, and
     * `hasRows` would read the array's length as a slot count. Nothing would
     * throw. `helix-data-table` takes exactly that property, which is what
     * found this before it happened.
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
     * thing an empty state must never do. Listbox's spec caught precisely that.
     */
    protected countRows(event: Event): void {
      this.slotCounted = true
      this.slotRows = (event.target as HTMLSlotElement).assignedElements().length
    }

    protected get hasRows(): boolean {
      return this.slotCounted ? this.slotRows > 0 : true
    }

    /**
     * Counts the rows slot after every render.
     *
     * `slotchange` alone is not enough, and the gap is exactly the case this
     * mixin exists for: the event fires when an assignment *changes*, and a
     * collection that arrives with nothing in it has no change to report. So a
     * list that was empty from the start never learned it was empty and said
     * nothing at all, which is the blank box a reader cannot tell from a broken
     * one. Measured on Table, whose rows slot starts empty.
     *
     * The default slot, by name, because that is where every collection in this
     * library puts its rows: Listbox its options, Tree its items, Table its
     * rows, Menu and Drilldown their pages. A named slot is a header or a
     * footer, and neither is content.
     *
     * `updated` never runs on the server, which is what keeps `counted` false
     * exactly when the answer is unknown.
     */
    protected override updated(changed: Map<PropertyKey, unknown>): void {
      super.updated?.(changed)
      const slot = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot:not([name])')
      if (!slot) {
        return
      }
      const rows = slot.assignedElements().length
      this.slotCounted = true
      if (rows !== this.slotRows) {
        this.slotRows = rows
      }
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
