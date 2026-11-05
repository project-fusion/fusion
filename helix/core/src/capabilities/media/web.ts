import type { CaptionTrack, Playback } from '../types.generated.js'
import type { Media } from './contract.generated.js'
import { media, setMedia } from './index.js'
import { serverMedia } from './server.js'

/** The events after which a media element stands somewhere new. */
const MOVES = [
  'durationchange',
  'emptied',
  'ended',
  'error',
  'loadedmetadata',
  'pause',
  'play',
  'playing',
  'seeked',
  'timeupdate',
  'volumechange',
  'waiting',
] as const

/** A media element's `HAVE_FUTURE_DATA`: below it, a playing element waits. */
const ENOUGH = 3

/** The tracks a media element shows captions or subtitles from, with the identifier each is chosen by. */
const textTracks = (node: HTMLMediaElement): { id: string; track: TextTrack }[] =>
  [...(node.textTracks as unknown as Iterable<TextTrack>)]
    .filter((track) => track.kind === 'captions' || track.kind === 'subtitles')
    .map((track, index) => ({ id: track.id || String(index), track }))

/**
 * Plays through the page's own `<video>` or `<audio>`: its `play()`, its time
 * and its length, its fullscreen and its picture in picture, its text tracks
 * for captions, and the browser's Media Session for the now-playing controls.
 *
 * **A length the media does not know yet is 0**, as a stream's `Infinity`
 * and a loading element's `NaN` are, so a time against it reads as nothing.
 */
export const webMedia: Media<HTMLMediaElement> = {
  captions: (node): readonly CaptionTrack[] =>
    textTracks(node).map(({ id, track }) => ({
      id,
      label: track.label,
      language: track.language,
    })),
  fullscreen: async (node, on) => {
    try {
      if (on && document.fullscreenElement !== node) {
        await node.requestFullscreen()
      } else if (!on && document.fullscreenElement === node) {
        await document.exitFullscreen()
      }
    } catch {
      /* Refused, as a browser refuses one no press asked for. */
    }
    return (document.fullscreenElement === node) === on
  },
  mute: (node, muted) => {
    node.muted = muted
  },
  nowPlaying: (_node, shown) => {
    const session = typeof navigator === 'undefined' ? undefined : navigator.mediaSession
    if (session === undefined || typeof MediaMetadata === 'undefined') {
      return
    }
    session.metadata =
      shown === null
        ? null
        : new MediaMetadata({
            artist: shown.artist ?? '',
            artwork: shown.artwork === undefined ? [] : [{ src: shown.artwork }],
            title: shown.title,
          })
  },
  observe: (node, changed) => {
    const tell = (): void => changed(webMedia.read(node))
    for (const name of MOVES) {
      node.addEventListener(name, tell)
    }
    return () => {
      for (const name of MOVES) {
        node.removeEventListener(name, tell)
      }
    }
  },
  pause: (node) => {
    node.pause()
  },
  pictureInPicture: async (node, on) => {
    const video = node as HTMLVideoElement
    try {
      if (on && document.pictureInPictureElement !== node) {
        if (typeof video.requestPictureInPicture !== 'function') {
          return false
        }
        await video.requestPictureInPicture()
      } else if (!on && document.pictureInPictureElement === node) {
        await document.exitPictureInPicture()
      }
    } catch {
      /* Refused, or not a video. */
    }
    return (document.pictureInPictureElement === node) === on
  },
  play: async (node) => {
    try {
      await node.play()
      return true
    } catch {
      return false
    }
  },
  rate: (node, rate) => {
    node.playbackRate = rate
  },
  read: (node): Playback => ({
    duration: Number.isFinite(node.duration) ? node.duration : 0,
    ended: node.ended,
    failed: node.error !== null,
    muted: node.muted,
    paused: node.paused,
    time: node.currentTime,
    waiting: !node.paused && node.readyState < ENOUGH,
  }),
  seek: (node, seconds) => {
    const end = Number.isFinite(node.duration) ? node.duration : seconds
    node.currentTime = Math.min(Math.max(seconds, 0), end)
  },
  showCaptions: (node, id) => {
    for (const one of textTracks(node)) {
      one.track.mode = one.id === id ? 'showing' : 'disabled'
    }
  },
}

/**
 * Sets the web's implementation where nothing else has been set, so a spec's
 * fake and an app's own stay in place.
 */
export const installWebMedia = (): void => {
  if (media() === serverMedia) {
    setMedia(webMedia)
  }
}
