/**
 * What a page reads and calls on a field for filters, by its ref: the web
 * element's `value`, its caret, `setSelectionRange()`, and `updateComplete`, as
 * a page that completes a suggestion over the term at the caret uses them.
 */
import { type RefObject, useMemo } from 'react'
import type { FieldHandle } from './validation'

/** A Filter Input's members on a phone. */
export interface FilterInputHandle extends FieldHandle {
  /** Where the caret's selection ends. */
  readonly selectionEnd: number
  /** Where the caret's selection starts. */
  readonly selectionStart: number
  /** Puts the caret, as the web's `setSelectionRange` does. */
  readonly setSelectionRange: (start: number, end: number) => void
  /** Settles once the field has drawn what was last written. */
  readonly updateComplete: Promise<boolean>
  /** The text. Writing it seeds or corrects the text, as on the web. */
  value: string
}

/** What the handle reads and writes of the field as it stands. */
export interface HandleHands {
  readonly caret: { readonly end: number; readonly start: number }
  readonly put: (start: number, end: number) => void
  readonly text: string
  readonly write: (text: string) => void
}

/** The handle's members, one object for every draw, reading the field as last drawn. */
export const useFilterHandle = (
  latest: RefObject<HandleHands>,
): Omit<FilterInputHandle, 'validate'> =>
  useMemo(
    () => ({
      get selectionEnd() {
        return latest.current.caret.end
      },
      get selectionStart() {
        return latest.current.caret.start
      },
      setSelectionRange: (start: number, end: number) => latest.current.put(start, end),
      get updateComplete() {
        /* A write is drawn on the next frame, as the web's update is. */
        return new Promise<boolean>((done) => requestAnimationFrame(() => done(true)))
      },
      get value() {
        return latest.current.text
      },
      set value(next: string) {
        latest.current.write(next)
      },
    }),
    [latest],
  )
