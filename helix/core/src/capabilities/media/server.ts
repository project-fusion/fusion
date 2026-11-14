import type { Playback } from '../types.generated.js'
import type { Media } from './contract.generated.js'

/** A player that has loaded nothing: at its start, paused, with no length yet. */
export const STILL_PLAYBACK: Playback = {
  duration: 0,
  ended: false,
  failed: false,
  muted: false,
  paused: true,
  time: 0,
  waiting: false,
}

/** Plays nothing: a server has no player, and every request says it did not stand. */
export const serverMedia: Media<unknown> = {
  captions: () => [],
  fullscreen: async () => false,
  mute: () => undefined,
  nowPlaying: () => undefined,
  observe: () => () => undefined,
  pause: () => undefined,
  pictureInPicture: async () => false,
  play: async () => false,
  rate: () => undefined,
  read: () => STILL_PLAYBACK,
  seek: () => undefined,
  showCaptions: () => undefined,
}
