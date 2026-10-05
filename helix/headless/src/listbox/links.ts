import type { HelixSelectEvent } from '@fusion.dev/helix-core'

/**
 * Runs `then` once a link option has been followed, for an owner whose panel
 * closes when a choice is made: Select and Combobox close on the listbox's
 * change, and a link changes nothing, so they hear the option's own
 * `helix-select` instead.
 *
 * After every listener has had the event, so a page that cancels it, to route
 * there itself, keeps the panel as it was, the way the option keeps the
 * browser from following.
 */
export const afterLinkFollowed = (event: Event, then: () => void): void => {
  if ((event as HelixSelectEvent).detail?.href === undefined) {
    return
  }
  queueMicrotask(() => {
    if (!event.defaultPrevented) {
      then()
    }
  })
}
