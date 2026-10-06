/**
 * Which extra controls a player offers, and which of them go behind the button.
 *
 * Separable because every answer here is taken from two written lists and three
 * facts, before anything is drawn: what the consumer asked for, what this
 * platform can do, and what is already on the bar. Nothing in it reaches the
 * media element and nothing in it renders, which is what keeps the roster one
 * decision rather than a condition spread across two templates.
 */

import { writtenList } from '@fusion.dev/helix-core'

/** What the existence of a control depends on, which only the player can answer. */
export interface Conditions {
  /** Whether this update is hydrating a server's markup. */
  hydrating: boolean
  /** Whether anything on the network has offered to play this. */
  remote: boolean
  /** Whether the consumer has refused picture in picture on the element. */
  refusedPip: boolean
  /** Whether a file is named, which is what a download needs. */
  source: boolean
}

/** Whether this platform can do a named control at all. */
export const offers = (one: string, player: Conditions): boolean => {
  /* As a server answers while hydrating what it sent: it has no document to
     ask, so it offered none, and a render that differs is a template Lit
     throws on. The update after hydration asks. */
  if (one === 'pip') {
    /* `disablePictureInPicture` is asked as well as the platform's own flag,
       because the two refuse from opposite ends and only one of them was read.
       A player carrying the attribute draws a button whose every press is
       rejected: the platform says no, the control is there anyway, and nothing
       tells the reader. */
    return (
      !player.hydrating &&
      !player.refusedPip &&
      typeof document !== 'undefined' &&
      document.pictureInPictureEnabled
    )
  }
  /* Availability, not support. A device that can play this has to exist for
     the button to mean anything: an AirPlay control with nothing to send to
     is a control that opens an empty list, which is worse than no control.
     `watchAvailability` is what answers that, and it answers late, so this
     reads a flag the watch keeps rather than asking. */
  if (one === 'remote') {
    return player.remote
  }
  /* A download needs something to download. `src` and not a slotted
     `<source>`: the element chose one of those and which one is the
     browser's business, so offering a specific file would be a guess about a
     decision already made. */
  if (one === 'download') {
    return player.source
  }
  /* Always offered, because there is nothing to check. Neither of these does
     anything to the video: they say the reader asked, and whatever holds the
     set answers. A player that hid them until it could prove a set existed
     would be a player that cannot know. */
  if (one === 'next' || one === 'previous') {
    return true
  }
  /* A skip needs only a timeline, and a video that has none cannot be played
     at all, so there is nothing here to check either. */
  if (one === 'forward' || one === 'rewind') {
    return true
  }
  return one === 'speed'
}

/**
 * What `full` stands for in a list of controls: every control that does
 * something to the video by itself, as Web Awesome's `full` preset adds speed
 * and picture in picture to its standard bar.
 *
 * `download`, `previous` and `next` are left out. Offering the file is a
 * decision about the content, and the other two move a set the player cannot
 * see, so each is named where it is wanted.
 */
export const FULL_CONTROLS = ['rewind', 'forward', 'speed', 'pip', 'remote'] as const

/** The names in a written list, with `full` read as the controls it stands for, each once. */
export const controlNames = (written: string): string[] => [
  ...new Set(
    writtenList(written).flatMap((one): readonly string[] =>
      one === 'full' ? FULL_CONTROLS : [one],
    ),
  ),
]

/** The extras asked for, in order, and only the ones this platform can do. */
export const barControls = (written: string, player: Conditions): string[] =>
  controlNames(written).filter((one) => offers(one, player))

/**
 * The controls asked for behind the overflow button, in order.
 *
 * A name in both lists is on the bar and not here. Drawing it twice is worse
 * than either placement, and the bar is the one a reader can see.
 */
export const menuControls = (
  written: string,
  onBar: readonly string[],
  player: Conditions,
): string[] => {
  const bar = new Set(onBar)
  return controlNames(written).filter((one) => !bar.has(one) && offers(one, player))
}

/**
 * Whether the file a `src` points at is the player's to hand over.
 *
 * Here because it is the download control's other condition: whether it is
 * drawn at all is `source`, and whether the `download` attribute on it means
 * anything is this.
 *
 * `blob:` and `data:` named rather than compared, because the rule `download`
 * actually follows is same-origin *or one of those two*: a clip a consumer
 * generated in the page has no origin to match and is theirs to save by
 * definition. Comparing origins alone called both foreign, so the one case
 * where a download certainly works was the one case it was not offered.
 */
export const ownFile = (src: string): boolean => {
  if (src === '') {
    return false
  }
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return true
  }
  if (typeof location === 'undefined') {
    return false
  }
  try {
    return new URL(src, location.href).origin === location.origin
  } catch {
    return false
  }
}
