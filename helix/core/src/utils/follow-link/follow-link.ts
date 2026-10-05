import type { HelixSelectEvent } from '../../events/events.js'

/** Where a row that is a link goes, in the words an `<a>` takes them. */
export interface LinkTarget {
  /** Whether following the link downloads what it names. */
  download?: boolean | undefined
  /** The URL. */
  href: string
  /** The link's `rel`. */
  rel?: string | undefined
  /** Where the link opens, such as `_blank`. */
  target?: string | undefined
}

/** The keys held as a link is followed, which say where a browser opens it. */
export interface LinkModifiers {
  altKey?: boolean | undefined
  ctrlKey?: boolean | undefined
  metaKey?: boolean | undefined
  shiftKey?: boolean | undefined
}

/**
 * Follows a link from an element that is not an `<a>`, the way the browser
 * follows one: in this tab, in the `target` named, or in a new tab or window
 * where Command, Control or Shift is held.
 *
 * **An option cannot hold an anchor.** `role="option"` sits on the option's
 * host, where `aria-activedescendant` can name it, and an `<a>` inside the
 * host is exposed as a link inside the option, which loses the option its name
 * (Menu Item's `href` records the measurement). So the option stays an option
 * and the link is followed through an anchor made for the moment, which is
 * React Aria's way for its own link items: the browser decides what the keys
 * mean, a new tab or a download, and nothing here guesses.
 *
 * The anchor is in the document only while it is clicked, and its click does
 * not bubble, so nothing on the page hears a click on something it never drew.
 */
export const followLink = (
  document: Document,
  link: LinkTarget,
  modifiers: LinkModifiers = {},
): void => {
  const anchor = document.createElement('a')
  anchor.href = link.href
  if (link.target) {
    anchor.target = link.target
  }
  if (link.rel) {
    anchor.rel = link.rel
  }
  if (link.download) {
    anchor.download = ''
  }
  anchor.hidden = true
  document.body.append(anchor)
  try {
    anchor.dispatchEvent(
      new MouseEvent('click', {
        altKey: Boolean(modifiers.altKey),
        cancelable: true,
        ctrlKey: Boolean(modifiers.ctrlKey),
        metaKey: Boolean(modifiers.metaKey),
        shiftKey: Boolean(modifiers.shiftKey),
      }),
    )
  } finally {
    anchor.remove()
  }
}

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
