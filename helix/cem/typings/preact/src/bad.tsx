import type { HelixButton } from '@fusion.dev/helix'
import { useRef } from 'preact/hooks'

// @ts-expect-error: a removed event class
export type Removed = import('@fusion.dev/helix').HelixToggleEvent

/** What a Preact app must not be able to write, each line under the guard that says why. */
export function Bad() {
  const button = useRef<HelixButton>(null)

  return (
    <>
      <helix-button
        // @ts-expect-error: a value outside the enum
        emphasis="loud"
        ref={button}
      />
      <helix-switch
        // @ts-expect-error: a misspelled property
        chekced
      />
      <helix-switch
        // @ts-expect-error: a detail field the event does not carry
        onhelix-before-check={(event) => event.detail.value}
      />
      {/* @ts-expect-error: a word for a numeric attribute */}
      <helix-pagination default-page="abc" />
      <helix-button
        // @ts-expect-error: an internal coordination member
        focusable
      />
    </>
  )
}

/* `button.current.focusable` is stripped from the declarations as well. */
export const focusable = (button: HelixButton) =>
  // @ts-expect-error: an internal coordination member
  button.focusable

/* **A misspelled or removed event is caught here, and never as a JSX prop.**
   TypeScript does not check a JSX attribute whose name holds a dash against
   the element's props, so `onhelix-before-chek` and `onhelix-before-toggle`
   compile on any tag. `addEventListener` reads the event map instead. */
const element = document.createElement('helix-switch')
// @ts-expect-error: a misspelled event, which has no typed detail
element.addEventListener('helix-before-chek', (event) => event.detail.checked)
// @ts-expect-error: a removed event name
element.addEventListener('helix-toggle', (event) => event.detail.checked)
