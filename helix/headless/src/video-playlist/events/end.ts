/**
 * A sequence played to its last entry and stopped there: a video playlist
 * with no `repeat`. Carries nothing, because the playlist still holds the last
 * entry. Not cancelable: playback has already ended.
 */
export class HelixEndEvent extends Event {
  static readonly eventName = 'helix-end'

  constructor() {
    super(HelixEndEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
