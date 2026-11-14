/**
 * What each key does to a player, and how far it moves.
 *
 * The table is core's `playerKey`, which a phone's player reads too: Space and
 * `k` play, the arrows scrub and change the volume, `m` mutes, `f` fills the
 * screen, `c` turns captions on and off, Home, End and the digits go to the
 * start, the end and each tenth, and `j` and `l` jump the distance the bar's
 * own buttons jump. What this module adds is the web's: which presses are a
 * control's own, and the media element each answer moves. Whether the keys are
 * bound at all, and what a taken press does to the event, stay with the element.
 */

import { PLAYER_KEYS, playerKey } from '@fusion.dev/helix-core/player'

export { PLAYER_KEYS }

/** What a press asks the player for, which is all a key can do. */
export interface KeyActions {
  captions: () => void
  fullscreen: () => void
  seek: (seconds: number) => void
  skipBy: (seconds: number) => void
  toggle: () => void
}

/** The controls whose own activation key is Space. */
const PRESSED_BY_SPACE = new Set(['a', 'button', 'select', 'summary', 'textarea'])

/** Roles whose element Space activates, whatever its tag. */
const PRESSED_ROLES = /^(button|checkbox|link|menuitem\w*|option|radio|switch|tab)$/

/** Whether a press is the browser's, the page's, or a control's own, and not the player's. */
const someoneElses = (event: KeyboardEvent): boolean => {
  /* **A chord with Control, Command or Alt is the browser's or the page's.**
     Alt with Left goes back a page and Command with a number picks a tab,
     and the player took both as seeks and stopped them. */
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
    return true
  }
  /* The element the press began on, inside whatever shadow root holds it:
     `target` is retargeted to the host of each root it leaves. */
  const origin = (event.composedPath?.()[0] ?? event.target) as HTMLElement | null
  if (origin?.tagName === 'INPUT' || origin?.isContentEditable) {
    return true
  }
  return (
    event.key === ' ' &&
    origin !== null &&
    (PRESSED_BY_SPACE.has(origin.localName) ||
      PRESSED_ROLES.test(origin.getAttribute?.('role') ?? ''))
  )
}

/**
 * Answers one press, and says whether it was one of these.
 *
 * Nothing is taken while focus is in a range. The scrubber and the volume are
 * real inputs and the arrows are already theirs, so intercepting would mean
 * seeking twice for one press.
 *
 * **Nor a press a control already handled, nor Space on a control.** Space is
 * how a button is pressed, so Space on Mute played the video and left it
 * unmuted, and a menu row chosen with Space also toggled playback. A key a
 * menu or a control took for itself arrives here already refused.
 */
export const takeKey = (
  event: KeyboardEvent,
  video: HTMLVideoElement,
  actions: KeyActions,
): boolean => {
  if (someoneElses(event)) {
    return false
  }
  const asked = playerKey(event.key, event.shiftKey)
  if (asked === undefined) {
    return false
  }
  switch (asked.kind) {
    case 'toggle':
      actions.toggle()
      break
    case 'seek-by':
      actions.seek(video.currentTime + asked.seconds)
      break
    case 'skip-by':
      actions.skipBy(asked.seconds)
      break
    /* Clamped here rather than left to the platform, which throws on a
       volume outside zero to one instead of taking the nearest legal one. */
    case 'volume-by':
      video.volume = Math.min(Math.max(video.volume + asked.by, 0), 1)
      break
    case 'mute':
      video.muted = !video.muted
      break
    case 'fullscreen':
      actions.fullscreen()
      break
    case 'captions':
      actions.captions()
      break
    case 'seek-to':
      /* A digit goes to that tenth of a video whose length is known, and is
         left alone where it is not. */
      if (asked.needsLength && !Number.isFinite(video.duration)) {
        return false
      }
      actions.seek(asked.share === 0 ? 0 : video.duration * asked.share)
      break
  }
  return true
}
