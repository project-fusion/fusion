import { type RefObject, useEffect } from 'react'

/** What this needs of a field: somewhere to put focus, once it exists. */
interface Focusable {
  focus: (options?: FocusOptions) => void
  updateComplete?: Promise<unknown>
}

/**
 * Focuses a field on arrival, once the element it names actually exists.
 */
export const useFocusOnLoad = (field: RefObject<Focusable | null>, tag = 'helix-input'): void => {
  useEffect(() => {
    let live = true
    void customElements.whenDefined(tag).then(async () => {
      await field.current?.updateComplete
      if (live) {
        field.current?.focus({ preventScroll: true })
      }
    })
    return () => {
      live = false
    }
  }, [field, tag])
}
