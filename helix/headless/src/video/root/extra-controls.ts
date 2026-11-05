/**
 * Which extra controls a player offers, and which of them go behind the button.
 *
 * The roster is core's (`@fusion.dev/helix-core/player`), which a phone's
 * player reads too: what the consumer asked for, what this platform can do,
 * and what is already on the bar. This module asks the document what the
 * browser offers, and says whether a file is the player's to hand over.
 */

import {
  barControls as barOf,
  controlNames,
  FULL_CONTROLS,
  menuControls as menuOf,
  type PlayerConditions,
  playerOffers,
} from '@fusion.dev/helix-core/player'

export { controlNames, FULL_CONTROLS }

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

/**
 * The conditions core's roster reads, with picture in picture asked of the
 * document.
 *
 * As a server answers while hydrating what it sent: it has no document to
 * ask, so it offered none, and a render that differs is a template Lit throws
 * on. The update after hydration asks. `disablePictureInPicture` is asked as
 * well as the platform's own flag, because the two refuse from opposite ends:
 * a player carrying the attribute would draw a button whose every press is
 * rejected.
 */
const conditionsOf = (player: Conditions): PlayerConditions => ({
  pip:
    !player.hydrating &&
    !player.refusedPip &&
    typeof document !== 'undefined' &&
    document.pictureInPictureEnabled,
  remote: player.remote,
  source: player.source,
})

/** Whether this platform can do a named control at all. */
export const offers = (one: string, player: Conditions): boolean =>
  playerOffers(one, conditionsOf(player))

/** The extras asked for, in order, and only the ones this platform can do. */
export const barControls = (written: string, player: Conditions): string[] =>
  barOf(written, conditionsOf(player))

/** The controls asked for behind the overflow button, in order, none of them on the bar. */
export const menuControls = (
  written: string,
  onBar: readonly string[],
  player: Conditions,
): string[] => menuOf(written, onBar, conditionsOf(player))

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
