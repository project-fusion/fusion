/**
 * A phone's player's hooks into its media: where it stands, the media events
 * a consumer hears, the web element's methods on its ref, and what a key or a
 * menu row asks of it.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { media, STILL_PLAYBACK } from '@fusion.dev/helix-core/capabilities/media'
import type { CaptionTrack, KeyPress, Playback } from '@fusion.dev/helix-core/capabilities/types'
import {
  clock,
  PLAYER_SKIP_SECONDS,
  type PlayerKey,
  playerKey,
  speedAfter,
} from '@fusion.dev/helix-core/player'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { tell } from './props'

/** The media the player plays through, once its view has made it. */
export type Node = unknown

/** The media events a change of playback sends, as the web's `<video>` sends them. */
const eventsOf = (before: Playback, now: Playback): string[] =>
  (
    [
      [before.duration <= 0 && now.duration > 0, ['durationchange', 'loadedmetadata']],
      [
        before.duration > 0 && now.duration > 0 && before.duration !== now.duration,
        ['durationchange'],
      ],
      [before.paused && !now.paused, ['play', 'playing']],
      [!before.paused && now.paused && !now.ended, ['pause']],
      [!before.ended && now.ended, ['pause', 'ended']],
      [!before.waiting && now.waiting, ['waiting']],
      [!before.failed && now.failed, ['error']],
      [before.muted !== now.muted, ['volumechange']],
      [before.time !== now.time, ['timeupdate']],
    ] as const
  ).flatMap(([holds, events]) => (holds ? events : []))

/** Where the media stands, followed while it plays, and the events each change sends. */
export const usePlayback = (node: Node, family: Family, props: Props): Playback => {
  const [playback, setPlayback] = useState<Playback>(STILL_PLAYBACK)
  const latest = useRef({ family, playback, props })
  latest.current = { family, playback, props }
  useEffect(() => {
    if (node === null) {
      setPlayback(STILL_PLAYBACK)
      return undefined
    }
    const heard = (now: Playback) => {
      const { playback: before, props: given, family: form } = latest.current
      latest.current = { ...latest.current, playback: now }
      setPlayback(now)
      for (const event of eventsOf(before, now)) {
        tell(form, given, event, {})
      }
    }
    heard(media().read(node))
    return media().observe(node, heard)
  }, [node])
  return playback
}

/** What the player does, which its controls, its keys, its menus, and its ref ask for. */
export interface Actions {
  readonly captions: (id: string | null) => void
  readonly fullscreen: () => void
  readonly mute: () => void
  readonly next: (back: boolean) => void
  readonly pip: () => void
  readonly seek: (seconds: number) => void
  /** Skips a skip's length forward, `1`, or back, `-1`, as the bar's skips do. */
  readonly skip: (direction: number) => void
  readonly speed: () => void
  readonly toggle: () => void
}

/** The hardware keys, heard while focus is in the player's stage, on the view it gives. */
export const useStageKeys = (heard: (press: KeyPress) => boolean) => {
  const [view, setView] = useState<unknown>(null)
  const latest = useRef(heard)
  latest.current = heard
  useEffect(
    () =>
      view === null ? undefined : keys().listen(view as never, (press) => latest.current(press)),
    [view],
  )
  return setView
}

/** What the actions need: the media, where it stands, the props, and what to set. */
export interface Acting {
  /** The events a request for the next and the previous video send. */
  readonly asks: { readonly next: string; readonly previous: string }
  readonly family: Family
  readonly full: boolean
  readonly node: Node
  readonly playback: Playback
  readonly props: Props
  readonly rate: number
  readonly setCaption: (id: string | null) => void
  readonly setFull: (full: boolean) => void
  readonly setRate: (rate: number) => void
  /** The speeds offered, as `speeds` writes them. */
  readonly speeds: string
}

/** The player's actions, made from what stands at this render. */
export const actionsOf = (at: Acting): Actions => {
  const { node, playback } = at
  return {
    captions: (id) => {
      if (node !== null) {
        media().showCaptions(node, id)
      }
      at.setCaption(id)
    },
    fullscreen: () => {
      if (node !== null) {
        void media()
          .fullscreen(node, !at.full)
          .then((stood) => stood && at.setFull(!at.full))
      }
    },
    mute: () => {
      if (node !== null) {
        media().mute(node, !playback.muted)
      }
    },
    next: (back) => {
      tell(at.family, at.props, back ? at.asks.previous : at.asks.next, {})
    },
    pip: () => {
      if (node !== null) {
        void media().pictureInPicture(node, true)
      }
    },
    seek: (seconds) => {
      if (node !== null && playback.duration > 0) {
        media().seek(node, Math.min(Math.max(seconds, 0), playback.duration))
        tell(at.family, at.props, 'seeked', {})
      }
    },
    skip: (direction) => {
      if (node !== null && playback.duration > 0) {
        const to = playback.time + direction * PLAYER_SKIP_SECONDS
        media().seek(node, Math.min(Math.max(to, 0), playback.duration))
        tell(at.family, at.props, 'seeked', {})
      }
    },
    speed: () => {
      const rate = speedAfter(at.speeds, at.rate)
      if (node !== null && rate !== undefined) {
        media().rate(node, rate)
        at.setRate(rate)
        tell(at.family, at.props, 'ratechange', {})
      }
    },
    toggle: () => {
      if (node === null) {
        return
      }
      if (playback.paused) {
        void media().play(node)
      } else {
        media().pause(node)
      }
    },
  }
}

/** The web element's methods, on the element's ref, which a playlist drives its player through. */
export const useHandle = (ref: unknown, node: Node, actions: Actions, playback: Playback) => {
  const now = useRef({ actions, node, playback })
  now.current = { actions, node, playback }
  useImperativeHandle(
    ref as Ref<unknown> | undefined,
    () => ({
      get currentTime() {
        return now.current.playback.time
      },
      get duration() {
        return now.current.playback.duration
      },
      get ended() {
        return now.current.playback.ended
      },
      pause: () => {
        const { node: playing } = now.current
        if (playing !== null) {
          media().pause(playing)
        }
      },
      get paused() {
        return now.current.playback.paused
      },
      play: async () => {
        const { node: playing } = now.current
        if (playing !== null) {
          await media().play(playing)
        }
      },
      seek: (seconds: number) => now.current.actions.seek(seconds),
      toggle: () => now.current.actions.toggle(),
    }),
    [],
  )
}

/** The words a key's change is said in, from the props. */
export interface Saying {
  readonly lang: string
  readonly read: (name: string) => unknown
  readonly tracks: readonly CaptionTrack[]
}

const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Answers one key, as the web's `takeKey` does, and says what it changed that
 * is not on the focused control. A phone has no volume to raise, so Up and
 * Down are left alone.
 */
export const answerKey = (
  key: string,
  shift: boolean,
  actions: Actions,
  playback: Playback,
  saying: Saying & { readonly captioned: boolean },
): boolean => {
  const asked = playerKey(key, shift)
  if (asked === undefined || asked.kind === 'volume-by') {
    return false
  }
  if (asked.kind === 'seek-by' || asked.kind === 'skip-by' || asked.kind === 'seek-to') {
    return seekByKey(asked, actions, playback, saying)
  }
  const said = pressByKey(asked.kind, actions, playback, saying)
  if (said !== undefined) {
    announce().say(wordsOf(saying.read(said)), 'polite')
  }
  return true
}

/** A key that presses a control, and the prop whose words say what it changed, if any. */
const pressByKey = (
  kind: 'captions' | 'fullscreen' | 'mute' | 'toggle',
  actions: Actions,
  playback: Playback,
  saying: Saying & { readonly captioned: boolean },
): string | undefined => {
  if (kind === 'toggle') {
    actions.toggle()
    return playback.paused ? 'playingLabel' : 'pausedLabel'
  }
  if (kind === 'mute') {
    actions.mute()
    return playback.muted ? 'unmutedLabel' : 'mutedLabel'
  }
  if (kind === 'fullscreen') {
    actions.fullscreen()
    return undefined
  }
  if (saying.tracks.length === 0) {
    return undefined
  }
  actions.captions(saying.captioned ? null : (saying.tracks[0]?.id ?? null))
  return saying.captioned ? 'captionsHiddenLabel' : 'captionsShownLabel'
}

/** A key's move through the media, and where it landed, said. A digit needs a known length. */
const seekByKey = (
  asked: Extract<PlayerKey, { readonly kind: 'seek-by' | 'skip-by' | 'seek-to' }>,
  actions: Actions,
  playback: Playback,
  saying: Saying,
): boolean => {
  if (asked.kind === 'seek-to' && asked.needsLength && !(playback.duration > 0)) {
    return false
  }
  const to =
    asked.kind === 'seek-to'
      ? playback.duration * asked.share
      : Math.min(Math.max(playback.time + asked.seconds, 0), playback.duration)
  actions.seek(to)
  announce().say(
    formatMessage(
      wordsOf(saying.read('timeLabel')),
      { duration: clock(playback.duration), position: clock(to) },
      saying.lang,
    ),
    'polite',
  )
  return true
}
