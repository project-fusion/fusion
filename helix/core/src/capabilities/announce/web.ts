import type { Urgency } from '../types.generated.js'
import type { Announce } from './contract.generated.js'

/**
 * Hidden from sight and kept in the accessibility tree, as a visually hidden
 * class does, so the region takes no room and a screen reader still reads it.
 */
const HIDDEN =
  'position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap'

/** The document's live region for each urgency, made the first time it speaks. */
const regions = new Map<Urgency, HTMLElement>()

const region = (urgency: Urgency): HTMLElement => {
  const found = regions.get(urgency)
  if (found?.isConnected) {
    return found
  }
  const made = document.createElement('div')
  made.setAttribute('aria-live', urgency)
  made.setAttribute('aria-atomic', 'true')
  made.setAttribute('style', HIDDEN)
  made.dataset.helixAnnounce = urgency
  document.body.append(made)
  regions.set(urgency, made)
  return made
}

/**
 * Says a message through a live region in the document, one per urgency.
 *
 * **The region is emptied, and the words land a frame later**, as core's
 * status regions do, so the same message said twice is a change both times
 * and a region made for it is in the tree before its words arrive.
 */
export const webAnnounce: Announce = {
  say: (message, urgency) => {
    const live = region(urgency)
    live.textContent = ''
    requestAnimationFrame(() => {
      live.textContent = message
    })
  },
}
