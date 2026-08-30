import { type RefObject, useEffect } from 'react'

/** What this needs of a field: somewhere to put focus, once it exists. */
interface Focusable {
  focus: (options?: FocusOptions) => void
  updateComplete?: Promise<unknown>
}

/**
 * Focuses a field on arrival, once the element it names actually exists.
 *
 * **A plain effect focuses nothing on a first load, and looks correct on every
 * other one.** Elements register as a side effect of importing
 * `@fusion.dev/helix`, and `HelixElements` does that import inside an effect of
 * its own, deliberately, so definitions land after React has hydrated rather
 * than before. That import is a promise. A page's own effect runs while it is
 * still in flight, so the ref holds an `<helix-input>` that has not upgraded: a
 * plain element with no `tabindex` and nothing focusable inside it, whose
 * `focus()` is a no-op that neither throws nor warns.
 *
 * **It survives a client navigation, which is what hid it.** Moving between
 * pages runs this after the definitions have already arrived, so the field is
 * upgraded and takes focus exactly as intended. Only a hard load fails, which
 * is the arrival that matters most, and it is the one nobody tests while
 * building. The symptom is "it types when I navigate here but not after a
 * reload".
 *
 * `whenDefined` waits for the class, and `updateComplete` waits for Lit to have
 * rendered the shadow input the focus is actually going to. Both, because the
 * first says the definition exists and the second says the box does.
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
