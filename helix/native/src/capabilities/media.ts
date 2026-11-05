import type { Media } from '@fusion.dev/helix-core/capabilities/media'
import type { CaptionTrack, NowPlaying, Playback } from '@fusion.dev/helix-core/capabilities/types'
import type * as ExpoVideo from 'expo-video'

/** The package, loaded the first time a player is made: `null` where the app does not install `expo-video`. */
let loaded: typeof ExpoVideo | null | undefined

/**
 * Loads `expo-video` once, or gives `null` where the app does not install it
 * or was built without its native module.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency (`allowOptionalDependencies` is on by default), so an app
 * without the package builds, draws no player, and plays nothing.
 */
export const loadVideo = (): typeof ExpoVideo | null => {
  if (loaded === undefined) {
    try {
      loaded = require('expo-video') as typeof ExpoVideo
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** What the media capability plays on a phone: a player, the view that shows it, and what it says it plays. */
export interface MediaNode {
  readonly player: ExpoVideo.VideoPlayer
  /** The view that shows the player, once it is drawn. Fullscreen and picture in picture need it. */
  view: ExpoVideo.VideoView | null
  /**
   * What the now-playing controls show, which a player takes with its source:
   * the view that draws the player loads its source again with it.
   */
  shown: NowPlaying | null
}

/** How close to its length a stopped player stands to have played to its end, in seconds. */
const END = 0.05

/** How often a playing player says where it stands, in seconds, as the web's `timeupdate` is about four times a second. */
const TICK = 0.25

/** Where `player` stands, as the web reads a media element. */
const readOf = (player: ExpoVideo.VideoPlayer): Playback => {
  const duration = Number.isFinite(player.duration) ? player.duration : 0
  return {
    duration,
    ended: !player.playing && duration > 0 && player.currentTime >= duration - END,
    failed: player.status === 'error',
    muted: player.muted,
    paused: !player.playing,
    time: player.currentTime,
    waiting: player.playing && player.status === 'loading',
  }
}

/** The events after which a player stands somewhere new. */
const MOVES = [
  'mutedChange',
  'playToEnd',
  'playingChange',
  'sourceLoad',
  'statusChange',
  'timeUpdate',
] as const

/** A caption track the media carries, by the identifier `showCaptions` takes. */
const idOf = (track: ExpoVideo.SubtitleTrack, index: number): string =>
  track.id ?? `${track.language}-${index}`

/** Calls `run`, and gives whether it settled. */
const settled = async (run: () => Promise<void>): Promise<boolean> => {
  try {
    await run()
    return true
  } catch {
    return false
  }
}

/**
 * Plays through `expo-video`'s player and its view, as the web plays through
 * its media element: the platform's own fullscreen player, its picture in
 * picture where the system has it, the caption tracks the media carries,
 * which the platform draws, and the lock screen's now-playing controls.
 *
 * **Captions come from the media**, as an HLS stream's or a file's own
 * tracks: `expo-video` takes no side-loaded WebVTT file and hands back no
 * cue's words, so a phone shows the platform's captions where the web's
 * player draws its own.
 */
export const nativeMedia: Media<MediaNode> = {
  captions: ({ player }): readonly CaptionTrack[] =>
    player.availableSubtitleTracks.map((track, index) => ({
      id: idOf(track, index),
      label: track.label,
      language: track.language,
    })),
  fullscreen: ({ view }, on) =>
    view === null
      ? Promise.resolve(false)
      : settled(() => (on ? view.enterFullscreen() : view.exitFullscreen())),
  mute: ({ player }, muted) => {
    player.muted = muted
  },
  nowPlaying: (node, shown) => {
    node.shown = shown
    node.player.showNowPlayingNotification = shown !== null
  },
  observe: ({ player }, changed) => {
    if (player.timeUpdateEventInterval <= 0) {
      player.timeUpdateEventInterval = TICK
    }
    const tell = () => changed(readOf(player))
    const heard = MOVES.map((name) => player.addListener(name, tell))
    return () => {
      for (const one of heard) {
        one.remove()
      }
    }
  },
  pause: ({ player }) => {
    player.pause()
  },
  pictureInPicture: ({ view }, on) => {
    if (view === null || loadVideo()?.isPictureInPictureSupported() !== true) {
      return Promise.resolve(false)
    }
    return settled(() => (on ? view.startPictureInPicture() : view.stopPictureInPicture()))
  },
  play: ({ player }) => {
    if (player.status === 'error') {
      return Promise.resolve(false)
    }
    player.play()
    return Promise.resolve(true)
  },
  rate: ({ player }, rate) => {
    player.playbackRate = rate
  },
  read: ({ player }) => readOf(player),
  seek: ({ player }, seconds) => {
    const end = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : seconds
    player.currentTime = Math.min(Math.max(seconds, 0), end)
  },
  showCaptions: ({ player }, id) => {
    const tracks = player.availableSubtitleTracks
    player.subtitleTrack = tracks.find((track, index) => idOf(track, index) === id) ?? null
  },
}
