/**
 * A video player on a phone: the picture through the media capability, the
 * bar Helix draws over it, the keys, and what a screen reader hears.
 *
 * **The picture is expo-video's**, an optional peer, drawn in the `video`
 * part by a `MediaView`, whose player the capability plays, pauses, seeks,
 * mutes, and fills the screen with. A phone without the peer draws the
 * poster and says the video cannot be played, in the words of `error-text`.
 *
 * **The bar's controls** are the tree's: play and pause, the time, the
 * scrubber as a Slider, the mute, the captions as a press or a Menu of the
 * tracks the media carries, the extras in the order written, and a Menu of
 * the overflow. It hides once a playing video has gone `idle-delay` without
 * a touch, and a touch brings it back. A press on the picture plays or
 * pauses, or brings the bar back while it rests.
 *
 * **The keys** of a hardware keyboard answer as the web's, while focus is in
 * the player, and what one changed is said.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { media } from '@fusion.dev/helix-core/capabilities/media'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Pressable } from 'react-native'
import { loadVideo, type MediaNode } from '../capabilities/media'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import { MediaView, playsVideo } from '../render/media-view'
import { useReducedMotion } from '../render/motion'
import type { Family } from '../style/form'
import { kebab } from './date-picker-read'

import { useIdle } from './lightbox-idle'
import { boundTo, given } from './props'
import {
  type Actions,
  actionsOf,
  answerKey,
  useHandle,
  usePlayback,
  useStageKeys,
} from './video-hooks'
import { type Held, marksOf, videoValues } from './video-model'

const words = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Whether the system offers picture in picture here. */
const offersPip = (): boolean => loadVideo()?.isPictureInPictureSupported() === true

/** What a row of a menu the player opens does, by its value. */
const chosen = (value: string, actions: Actions): void => {
  if (value === 'off') {
    actions.captions(null)
  } else if (value.startsWith('caption:')) {
    actions.captions(value.slice('caption:'.length))
  } else {
    pressedExtra(value, actions)
  }
}

/** What an extra control does, by its name, on the bar or in the menu. */
const pressedExtra = (name: string, actions: Actions): void => {
  const by: Readonly<Record<string, () => void>> = {
    forward: () => actions.skip(1),
    next: () => actions.next(false),
    pip: actions.pip,
    previous: () => actions.next(true),
    rewind: () => actions.skip(-1),
    speed: actions.speed,
  }
  by[name]?.()
}

/** The caption tracks the media carries, read again each time it loads. */
const tracksOf = (node: MediaNode | null) => (node === null ? [] : media().captions(node))

/** Whether a play has started since `src` was set, which takes the poster away. */
const usePlayed = (src: string, paused: boolean): boolean => {
  const [playedFor, setPlayedFor] = useState<string | null>(null)
  useEffect(() => {
    if (!paused) {
      setPlayedFor(src)
    }
  }, [paused, src])
  return playedFor === src
}

/** What the now-playing controls show of the media, made again only when it changes. */
const useShown = (artwork: string, title: string) =>
  useMemo(() => (artwork === '' ? { title } : { artwork, title }), [artwork, title])

/** The picture: the player's view in the part, with a press on it that plays, pauses, or wakes the bar. */
const pictured =
  (picture: ReactNode, onPress: () => void, own: boolean) =>
  (view: ReactNode): ReactNode => {
    const drawn = isValidElement(view)
      ? cloneElement(view as ReactElement<{ children?: ReactNode }>, undefined, picture)
      : view
    return own ? (
      drawn
    ) : (
      <Pressable accessible={false} onPress={onPress} style={{ alignSelf: 'stretch' }}>
        {drawn}
      </Pressable>
    )
  }

/** Starts a player that asks to on its own, unless the reader asked for less motion, and mutes one that asks. */
const useStart = (node: MediaNode | null, autoplay: boolean, muted: boolean, still: boolean) => {
  useEffect(() => {
    if (node === null) {
      return
    }
    if (muted) {
      media().mute(node, true)
    }
    if (autoplay && !still) {
      void media().play(node)
    }
  }, [autoplay, muted, node, still])
}

/** Hosts the player. */
export const useVideo = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const lang = locale().read()
  const [node, setNode] = useState<MediaNode | null>(null)
  const [caption, setCaption] = useState<string | null>(null)
  const [full, setFull] = useState(false)
  const [rate, setRate] = useState(1)
  const playback = usePlayback(node, family, props)
  const src = words(read('src'))
  const played = usePlayed(src, playback.paused)
  const tracks = tracksOf(node)
  const held: Held = { caption, full, playback, played, plays: playsVideo(), rate, tracks }
  const values = videoValues(read, held, offersPip(), lang)
  const idle = useIdle(Number(read('idleDelay')) || 0, values.playing)
  const still = useReducedMotion()
  useStart(node, read('autoplay') === true, read('muted') === true, still)
  const actions = actionsOf({
    asks: {
      next: boundTo(use, 'onNext', 'event') ?? 'next',
      previous: boundTo(use, 'onPrevious', 'event') ?? 'previous',
    },
    family,
    full,
    node,
    playback,
    props,
    rate,
    setCaption,
    setFull,
    setRate,
    speeds: words(read('speeds')),
  })
  useHandle(props.ref, node, actions, playback)
  const { stir } = idle
  const own = read('controls') === true
  const setStage = useStageKeys((press: KeyPress): boolean => {
    stir()
    if (press.alt || press.control || press.meta || own) {
      return false
    }
    return answerKey(press.key, press.shift, actions, playback, {
      captioned: caption !== null,
      lang,
      read,
      tracks,
    })
  })
  const shown = useShown(words(read('poster')), words(read('mediaTitle')) || words(read('label')))
  const picture = (
    <MediaView
      controls={own}
      handle={setNode}
      loop={read('loop') === true}
      nowPlaying={shown}
      onFullscreen={setFull}
      pictureInPicture={values.extras.some((one) => one.name === 'pip')}
      source={src === '' ? null : src}
      style={{ flexGrow: 1 }}
    />
  )
  const onPicture = () => {
    if (idle.resting && values.playing) {
      stir()
    } else {
      actions.toggle()
    }
  }
  return {
    marks: marksOf(values, held, idle.resting),
    measured: ratioOf(node),
    parts: {
      captions: {
        view: {
          onPress: () => actions.captions(caption === null ? (tracks[0]?.id ?? null) : null),
        },
      },
      entry: {
        copy: (item: Entry) => ({
          onBeforeSelect: () => chosen(String(item.fields.value ?? ''), actions),
        }),
      },
      extra: {
        copy: (item: Entry) => ({
          onPress: () => pressedExtra(String(item.fields.name ?? ''), actions),
        }),
      },
      fullscreen: { view: { onPress: actions.fullscreen } },
      host: {
        lists: {
          [flag('captionRows')]: values.captionRows,
          [flag('extras')]: values.extras,
          [flag('overflowRows')]: values.overflowRows,
        },
        states: Object.fromEntries(
          Object.entries(values)
            .filter(([, value]) => typeof value !== 'object')
            .map(([name, value]) => [
              flag(name),
              typeof value === 'number' ? String(value) : value,
            ]),
        ) as Record<string, boolean | string>,
      },
      mute: { view: { onPress: actions.mute } },
      play: { view: { onPress: actions.toggle } },
      scrubber: {
        view: {
          onBeforeChange: (event: { detail: { value?: string } }) => {
            actions.seek(Number(event.detail.value))
          },
        },
      },
      stage: { view: { onTouchStart: stir, ref: setStage } },
      start: { view: { onPress: actions.toggle } },
      video: { wrap: pictured(picture, onPicture, own) },
    },
  }
}

/** The media's own shape once it is known, which the picture takes until a page sets its own. */
const ratioOf = (node: MediaNode | null): Readonly<Record<string, string>> => {
  const size = node?.player?.availableVideoTracks?.[0]?.size
  return size !== undefined && size.width > 0 && size.height > 0
    ? { 'video-intrinsic-ratio': `${size.width} / ${size.height}` }
    : {}
}
