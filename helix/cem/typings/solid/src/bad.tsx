import type { HelixButton } from '@fusion.dev/helix'

// @ts-expect-error: a removed event class
export type Removed = import('@fusion.dev/helix').HelixToggleEvent

/** What a Solid app must not be able to write, each line under the guard that says why. */
export function Bad() {
  return (
    <>
      <helix-button
        // @ts-expect-error: a value outside the enum
        emphasis="loud"
      />
      {/* @ts-expect-error: a value outside the enum, set as a property */}
      <helix-button prop:emphasis="loud" />
      <helix-switch
        // @ts-expect-error: a misspelled property
        chekced
      />
      <helix-switch
        // @ts-expect-error: a misspelled property, set as a property
        prop:chekced
      />
      {/* @ts-expect-error: a detail field the event does not carry */}
      <helix-switch on:helix-before-check={(event) => event.detail.value} />
      {/* @ts-expect-error: a word for a numeric attribute */}
      <helix-pagination default-page="abc" />
      <helix-button
        // @ts-expect-error: an internal coordination member
        focusable
      />
    </>
  )
}

export const focusable = (button: HelixButton) =>
  // @ts-expect-error: an internal coordination member
  button.focusable

/* **A misspelled or removed event is caught here, and never as a JSX prop.**
   TypeScript does not check a JSX attribute whose name holds a dash against
   the element's props, so `on:helix-before-chek` and `on:helix-toggle` compile
   on any tag. A colon alone is checked, which is why `prop:chekced` is
   refused. `addEventListener` reads the event map instead. */
const element = document.createElement('helix-switch')
// @ts-expect-error: a misspelled event, which has no typed detail
element.addEventListener('helix-before-chek', (event) => event.detail.checked)
// @ts-expect-error: a removed event name
element.addEventListener('helix-toggle', (event) => event.detail.checked)
