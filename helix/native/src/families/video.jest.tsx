/*
 * The generated Video, drawn from its real intermediate form: a player whose
 * picture is expo-video's, played through a fake media capability, with the
 * bar Helix draws over it. It plays and pauses from its controls, its keys,
 * and a press on the picture, says what a key changed, offers its extras in
 * the order written, asks for the next video, drives the caption tracks the
 * media carries, hides its bar while a playing video is left alone, and is
 * driven through its ref, as a playlist drives it. `test:native` writes the
 * component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { media, setMedia } from '@fusion.dev/helix-core/capabilities/media'
import { type FakeMedia, fakeMedia } from '@fusion.dev/helix-core/capabilities/media/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixVideo } from './video/index.native'

jest.mock('expo-video', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    isPictureInPictureSupported: () => true,
    useVideoPlayer: (source: unknown) => {
      const { useMemo } = jest.requireActual<typeof import('react')>('react')
      return useMemo(() => ({ availableVideoTracks: [], loop: false, source }), [source])
    },
    VideoView: View,
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let stage: unknown
let announced: FakeAnnounce
let played: FakeMedia<unknown>
let clock: FakeTimers
const real = timers()
const before = media()

const app = (content: ReactNode) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>{content}</LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** The player's media, as its view handed it over. */
const node = (): unknown => lastNode
let lastNode: unknown

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((one) => test(one.props)) ?? []

/** The views a screen reader reaches by `label`. */
const labeled = (label: string) => viewsWhere((props) => props.accessibilityLabel === label)

/** Presses the control a screen reader names `label`. */
const press = async (label: string) => {
  const found = labeled(label)[0]
  if (found === undefined) {
    throw new Error(`no press named ${label}`)
  }
  await act(async () => fireEvent.press(found))
  await frames()
}

/** Moves the media as a player does, and lets the player draw it. */
const place = async (playback: Parameters<FakeMedia<unknown>['place']>[1]) => {
  await act(async () => played.place(node(), playback))
  await frames()
}

type Told = string[]

const player = (told: Told, extra: Readonly<Record<string, unknown>> = {}) => (
  <HelixVideo
    label="Product walkthrough"
    onNext={() => told.push('next')}
    onPause={() => told.push('pause')}
    onPlay={() => told.push('play')}
    src="https://example.com/clip.mp4"
    {...extra}
  />
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  clock = fakeTimers()
  played = fakeMedia()
  const observe = played.observe
  setMedia({
    ...played,
    observe: (one, changed) => {
      lastNode = one
      return observe(one, changed)
    },
  })
  setKeys({
    ...keys,
    listen: (view, heard) => {
      stage = view
      return keys.listen(view, heard)
    },
  })
  setAnnounce(announced)
  setTimers(clock)
})

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  setTimers(real)
  setMedia(before)
})

describe('Video', () => {
  test('draws its bar over the picture, named by its label, with the time and a start control', async () => {
    await draw(player([]))
    expect(labeled('Product walkthrough').length).toBeGreaterThan(0)
    for (const control of ['Play', 'Mute', 'Fullscreen', 'Seek']) {
      expect(labeled(control).length).toBeGreaterThan(0)
    }
    expect(drawn?.queryByText('0:00 / 0:00', { includeHiddenElements: true })).not.toBeNull()
    await place({ duration: 75, time: 12 })
    expect(drawn?.queryByText('0:12 / 1:15', { includeHiddenElements: true })).not.toBeNull()
  })

  test('plays from its control, and tells play and pause as the media moves', async () => {
    const told: Told = []
    await draw(player(told))
    await press('Play')
    expect(played.calls.some((one) => one.call === 'play')).toBe(true)
    await place({ paused: false })
    expect(labeled('Pause').length).toBeGreaterThan(0)
    await press('Pause')
    await place({ paused: true })
    expect(told).toEqual(['play', 'pause'])
  })

  test('the keys play, seek, and mute, and what each changed is said', async () => {
    await draw(player([]))
    await place({ duration: 60, time: 20 })
    await act(async () => {
      keys.press(stage, 'k')
    })
    expect(announced.said.at(-1)?.message).toBe('Playing')
    await act(async () => {
      keys.press(stage, 'ArrowRight')
    })
    expect(played.calls.at(-1)).toMatchObject({ call: 'seek', seconds: 25 })
    expect(announced.said.at(-1)?.message).toBe('0:25 of 1:00')
    await act(async () => {
      keys.press(stage, '5')
    })
    expect(played.calls.at(-1)).toMatchObject({ call: 'seek', seconds: 30 })
    await act(async () => {
      keys.press(stage, 'm')
    })
    expect(announced.said.at(-1)?.message).toBe('Muted')
  })

  test('offers its extras in the order written, and asks for the next video', async () => {
    const told: Told = []
    await draw(player(told, { extraControls: 'speed next rewind' }))
    const order = viewsWhere(
      (props) =>
        typeof props.accessibilityLabel === 'string' &&
        ['Playback speed', 'Next', 'Back 10 seconds'].includes(props.accessibilityLabel),
    ).map((one) => one.props.accessibilityLabel)
    expect([...new Set(order)]).toEqual(['Playback speed', 'Next', 'Back 10 seconds'])
    await press('Next')
    expect(told).toEqual(['next'])
    await press('Playback speed')
    expect(played.calls.at(-1)).toMatchObject({ call: 'rate', rate: 1.5 })
    expect(drawn?.queryByText('1.5x', { includeHiddenElements: true })).not.toBeNull()
  })

  test('turns on the caption track the media carries, and a menu chooses among several', async () => {
    await draw(player([]))
    await act(async () => played.tracks(node(), [{ id: 'en', label: 'English', language: 'en' }]))
    await place({ duration: 30 })
    await press('Captions')
    expect(played.calls.at(-1)).toMatchObject({ call: 'captions', id: 'en' })
    await act(async () =>
      played.tracks(node(), [
        { id: 'en', label: 'English', language: 'en' },
        { id: 'fr', label: 'Français', language: 'fr' },
      ]),
    )
    await place({ duration: 31 })
    expect(labeled('Subtitles').length).toBeGreaterThan(0)
  })

  test('hides its bar once a playing video is left alone for idle-delay', async () => {
    await draw(player([], { idleDelay: 1000 }))
    await place({ paused: false })
    const opacity = () =>
      StyleSheet.flatten(
        drawn?.getByText('0:00 / 0:00', { includeHiddenElements: true }).parent?.parent?.props
          .style,
      )?.opacity
    expect(opacity()).not.toBe(0)
    await act(async () => clock.advance(1000))
    await frames()
    expect(opacity()).toBe(0)
  })

  test('its ref plays, pauses, and seeks, as a playlist drives its player', async () => {
    const ref: { current: { pause(): void; play(): Promise<void>; seek(s: number): void } | null } =
      { current: null }
    await draw(player([], { ref }))
    await place({ duration: 40 })
    await act(async () => ref.current?.play())
    await act(async () => ref.current?.seek(8))
    await act(async () => ref.current?.pause())
    expect(played.calls.map((one) => one.call)).toEqual(['play', 'seek', 'pause'])
  })
})
