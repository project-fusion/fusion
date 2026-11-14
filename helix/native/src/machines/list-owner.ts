/**
 * What a list drawn inside another element reads of that element: a Select's or a
 * Combobox's, where the list opens, how it closes, and what a field around it holds.
 */
import type { ListHands } from './combobox-keys'

/** Where the highlight goes as the list opens, by the key that opened it. */
export interface ListOpening {
  /** The option a typed letter landed on, which takes the place of `where`. */
  readonly value?: string | undefined
  readonly where: 'first' | 'last' | 'none' | 'selected'
}

/** What a list drawn inside a Select reads of the Select. */
export interface ListOwner {
  /** Hears the option the highlight stands on, for a field that holds focus and says it. */
  readonly active?: (value: string) => void
  /** Closes the list, as the chosen option pressed again does. */
  readonly again: () => void
  /** Filters the list, where the field around holds what was typed. */
  readonly filter?: string
  /** What the field around asks of the list, written while the list is drawn. */
  readonly hands?: { current: ListHands | undefined }
  /** Leaves focus where it stands as the list opens, in a field a reader types in. */
  readonly keepsFocus?: boolean
  /** Hears the view of the option the list opened on. */
  readonly landed: (row: unknown) => void
  /** Where the highlight goes as the list opens. */
  readonly opening: ListOpening
  /** Closes the list and lets focus move on, as Tab does. */
  readonly tab: () => void
}
