import { html, nothing, type TemplateResult } from 'lit'

/** What a listbox's holder says in the list's status slots. */
export interface ListStatus {
  /** The words while the list has no options, the `empty` slot's fallback. */
  emptyText: string
  /** The holder, whose light DOM may fill `no-results`. */
  host: Element
  /** The words while the options could not load, the `error` slot's fallback. */
  loadError: string
  /** The words while the options load, the `loading` slot's fallback. */
  loadingText: string
  /** Called when what fills `no-results` changes, so the holder renders again. */
  refill: () => void
}

/**
 * The holder's `empty`, `loading`, `error` and `no-results` slots, handed on
 * to the list's own.
 *
 * **With the holder's words as each fallback**, because a slot passed into
 * another is assigned there whether or not anything fills it, so the list's
 * own fallback would never show. **`no-results` only while something fills
 * it**, for the same reason the other way: assigned, it hides the list's
 * fallback, which is `no-results-text` or `empty-text`. Combobox and Command
 * wrote these four slots the same way, each.
 */
export const renderListStatus = (status: ListStatus): TemplateResult =>
  html`<slot name="empty" slot="empty">${status.emptyText}</slot>
    <slot name="loading" slot="loading">${status.loadingText}</slot>
    <slot name="error" slot="error">${status.loadError}</slot>
    <slot
      name="no-results"
      slot=${status.host.querySelector?.(':scope > [slot="no-results"]') ? 'no-results' : nothing}
      @slotchange=${status.refill}
    ></slot>`
