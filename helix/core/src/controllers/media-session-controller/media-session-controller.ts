import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Which player currently owns the page's one media session.
 *
 * There is exactly one `navigator.mediaSession` per page, and it decides what
 * the lock screen shows and where a headset's buttons land. Two players cannot
 * both have it, so the rule is written down rather than left to whichever
 * rendered last: **whoever played most recently owns it**, which is what a
 * reader means by "this one" when they press play on their headphones.
 *
 * Module scope, because the thing being shared is the page's and not any
 * element's. A player gives it up when it leaves the document, and only if it
 * still holds it: one that already lost the session to another must not clear
 * that other one's metadata on its way out.
 */
let owner: HTMLElement | undefined

/**
 * How far a skip control moves, in seconds.
 *
 * Ten, which is the number every player that has one uses, and the number the
 * platform names in `seekbackward` and `seekforward` when it hands over a
 * default. A different length here would be correct only on this player.
 */
export const SKIP_SECONDS = 10

/** What a headset's buttons do, handed over by the player that owns them. */
export interface SessionHandlers {
  /**
   * Asks for the next item, or `null` where the consumer has named nothing to
   * skip to: the platform draws the key from whether a handler is set.
   */
  next: (() => void) | null
  /** And the previous one, under the same rule. */
  previous: (() => void) | null
  seek: (seconds: number) => void
  skipBy: (seconds: number) => void
  toggle: () => void
}

/**
 * Holds the page's media session for one player, and tells the platform what
 * is playing.
 *
 * The handlers are what make a headset's play, pause and skip work at all.
 * Without them a platform falls back to guessing which element was meant,
 * which is right often enough to hide the fault and wrong exactly when there
 * are two.
 */
export class MediaSessionController implements ReactiveController {
  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this)
  }

  /**
   * Takes the session.
   *
   * On play rather than on render, which is the ownership rule: a page with two
   * players gives the session to whichever one the reader started, so a
   * headset's buttons land on what they are listening to rather than on
   * whichever came first in the markup.
   */
  claim(metadata: { artwork: string; title: string }, handlers: SessionHandlers): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) {
      return
    }
    owner = this.host
    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({
      artwork: metadata.artwork === '' ? [] : [{ src: metadata.artwork }],
      title: metadata.title,
    })
    session.setActionHandler('play', handlers.toggle)
    session.setActionHandler('pause', handlers.toggle)
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        handlers.seek(details.seekTime)
      }
    })
    /* The platform asks for a length and we answer with ours, or with its
       default where it did not say. A lock screen offering a skip that moves a
       different distance than the button on the bar is one player with two
       answers to the same gesture. */
    session.setActionHandler('seekbackward', (details) => {
      handlers.skipBy(-(details.seekOffset ?? SKIP_SECONDS))
    })
    session.setActionHandler('seekforward', (details) => {
      handlers.skipBy(details.seekOffset ?? SKIP_SECONDS)
    })
    /* The skip keys, and only where the consumer has said there is something to
       skip to. A headset whose skip buttons do nothing is worse than one whose
       skip buttons are not offered: the platform draws them from whether a
       handler is set, so setting one unconditionally would put two dead keys on
       every lock screen showing this video. */
    session.setActionHandler('nexttrack', handlers.next)
    session.setActionHandler('previoustrack', handlers.previous)
  }

  /** Tells the platform whether the owner is playing, and nothing if it is not the owner. */
  report(playing: boolean): void {
    if (owner === this.host && typeof navigator !== 'undefined' && navigator.mediaSession) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    }
  }

  /**
   * The page's one media session goes back to nobody, but only if this
   * element is the one holding it.
   */
  hostDisconnected(): void {
    if (owner !== this.host) {
      return
    }
    owner = undefined
    if (typeof navigator !== 'undefined' && navigator.mediaSession) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
  }
}
