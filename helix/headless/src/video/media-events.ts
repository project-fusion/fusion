/**
 * The media events a player sends on from its inner `<video>`, and how.
 *
 * Separable because the set is a decision about the platform, and nothing in it
 * draws. It is the HTML standard's own summary of the events a media element
 * fires, every one of them, so a consumer who listened on a `<video>` listens
 * on the player with the same names and hears the same things. A shorter list
 * would be one more list for a consumer to learn.
 *
 * None of these crosses a shadow boundary on its own. The video is inside the
 * player's shadow root, so a listener on the element a consumer wrote hears
 * nothing at all without the relay.
 */

/**
 * Every event a media element fires, by the standard's names, sorted.
 *
 * `resize` is on the list because the standard puts it there: it fires when the
 * video's own width or height changes, which is the moment a consumer sizing
 * something to the picture needs.
 */
export const MEDIA_EVENTS = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'resize',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
] as const

/** One of the media events the player relays. */
export type MediaEventName = (typeof MEDIA_EVENTS)[number]

/**
 * The copy the host sends: the same name, neither bubbling nor composed.
 *
 * **As the platform sends it, which is what makes it reach a React consumer at
 * all.** These names are in react-dom's `nonDelegatedEvents`, which React wires
 * on a `<video>` and never on a custom element, so its root listener hears none
 * of them. `bindReactHandler` closes that for an event that does not bubble,
 * and skips one that does, on the grounds that a bubbling relay already reaches
 * React's delegated listener and binding it again would double every call. A
 * copy sent with `bubbles: true` lands in the branch that refuses to bind, and
 * `onPlay` on the player is silent.
 *
 * Not cancelable, as the platform's are not: the media has already moved by the
 * time the event is sent, and a refusal would have nothing to stop.
 */
export const relayedCopy = (event: Event): Event =>
  new Event(event.type, { bubbles: false, cancelable: false, composed: false })

/**
 * Sends each media event the video fires on from the host, and returns what
 * stops it.
 *
 * Bound once, after the first render, so the player's own listeners in its
 * template are ahead of it on the same video: what a consumer reads off the
 * player in a handler (`paused`, `volume`, `currentTime`) is already the
 * player's state by the time the copy reaches them.
 */
export const relayMedia = (video: EventTarget, host: EventTarget): (() => void) => {
  const relay = (event: Event): void => {
    host.dispatchEvent(relayedCopy(event))
  }
  for (const name of MEDIA_EVENTS) {
    video.addEventListener(name, relay)
  }
  return () => {
    for (const name of MEDIA_EVENTS) {
      video.removeEventListener(name, relay)
    }
  }
}
