/*
 * The generated Video Playlist, drawn from its real intermediate form, with a
 * stand-in player passed into `player`: the playlist points the player at the
 * current entry, marks that entry current, asks `before-activate` before a
 * move and sends `activate` after, plays the entry a reader chose through the
 * player's handle and says it, moves on at the end of a clip and on the
 * player's previous and next, and sends `end` after the last. `test:native`
 * writes the component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import { type Ref, useImperativeHandle } from 'react'
import { Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import {
  HelixVideoPlaylist,
  HelixVideoPlaylistItem,
  HelixVideoPlaylistMenu,
} from './video-playlist/index.native'

let drawn: Awaited<ReturnType<typeof render>> | undefined
let announced: FakeAnnounce

/** What the stand-in player was last given, and each play asked of it. */
const seen: { props: Readonly<Record<string, unknown>>; plays: number } = { plays: 0, props: {} }

const Player = (props: Readonly<Record<string, unknown>> & { readonly ref?: Ref<unknown> }) => {
  seen.props = props
  useImperativeHandle(props.ref, () => ({
    play: () => {
      seen.plays += 1
    },
    seek: () => undefined,
  }))
  return <Text>{String(props.src ?? '')}</Text>
}

type Told = [string, unknown][]

const playlist = (told: Told, extra: Readonly<Record<string, unknown>> = {}) => (
  <HelixTheme mode="light">
    <HelixVideoPlaylist
      defaultActive="one"
      label="Episodes"
      onActivate={(event: { detail: unknown }) => told.push(['activate', event.detail])}
      onBeforeActivate={(event: { detail: unknown }) =>
        told.push(['before-activate', event.detail])
      }
      onEnd={() => told.push(['end', {}])}
      player={<Player />}
      {...extra}
    >
      <HelixVideoPlaylistItem src="one.mp4" value="one">
        <Text>First</Text>
      </HelixVideoPlaylistItem>
      <HelixVideoPlaylistItem src="two.mp4" value="two">
        <Text>Second</Text>
      </HelixVideoPlaylistItem>
    </HelixVideoPlaylist>
  </HelixTheme>
)

const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: Parameters<typeof render>[0]) => {
  drawn = await render(content)
  await frames()
}

/** The press of the entry whose words are `words`. */
const pressEntry = async (words: string) => {
  await act(async () => fireEvent.press(drawn?.getByText(words) as never))
  await frames()
}

beforeEach(() => {
  announced = fakeAnnounce()
  setAnnounce(announced)
  seen.plays = 0
  seen.props = {}
})

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
})

describe('Video Playlist', () => {
  test('points the player at the current entry, named and titled by it', async () => {
    await draw(playlist([]))
    expect(seen.props).toMatchObject({ label: 'First', mediaTitle: 'First', src: 'one.mp4' })
    expect(seen.plays).toBe(0)
  })

  test('a press asks before-activate, moves, plays the entry, and says it', async () => {
    const told: Told = []
    await draw(playlist(told))
    await pressEntry('Second')
    expect(told).toEqual([
      ['before-activate', { cause: 'press', value: 'two' }],
      ['activate', { previous: 'one', value: 'two' }],
    ])
    expect(seen.props.src).toBe('two.mp4')
    expect(seen.plays).toBe(1)
    expect(announced.said.at(-1)?.message).toBe('Now playing Second')
  })

  test('the end of a clip plays the next, and the end of the last sends end', async () => {
    const told: Told = []
    await draw(playlist(told))
    await act(async () => (seen.props.onEnded as () => void)())
    await frames()
    expect(seen.props.src).toBe('two.mp4')
    await act(async () => (seen.props.onEnded as () => void)())
    await frames()
    expect(told.at(-1)).toEqual(['end', {}])
  })

  test("the player's next and previous move through the entries, round under repeat", async () => {
    await draw(playlist([], { repeat: 'all' }))
    await act(async () => (seen.props.onPrevious as () => void)())
    await frames()
    expect(seen.props.src).toBe('two.mp4')
    await act(async () => (seen.props.onNext as () => void)())
    await frames()
    expect(seen.props.src).toBe('one.mp4')
  })

  test('the menu of its entries opens on its trigger, and a row plays its entry', async () => {
    const told: Told = []
    await draw(
      <GestureHandlerRootView>
        <LayerHostView>
          <HelixTheme mode="light">
            <HelixVideoPlaylist
              defaultActive="one"
              label="Episodes"
              onActivate={(event: { detail: unknown }) => told.push(['activate', event.detail])}
              player={<Player />}
            >
              <HelixVideoPlaylistMenu label="Clips" />
              <HelixVideoPlaylistItem src="one.mp4" value="one">
                <Text>First</Text>
              </HelixVideoPlaylistItem>
              <HelixVideoPlaylistItem src="two.mp4" value="two">
                <Text>Second</Text>
              </HelixVideoPlaylistItem>
            </HelixVideoPlaylist>
          </HelixTheme>
        </LayerHostView>
      </GestureHandlerRootView>,
    )
    const trigger = drawn?.container.queryAll(
      (node) => node.props.accessibilityLabel === 'Clips',
    )[0]
    expect(trigger).toBeDefined()
    await act(async () => fireEvent.press(trigger as never))
    await frames()
    const seconds = drawn?.getAllByText('Second') ?? []
    expect(seconds.length).toBe(2)
    await act(async () => fireEvent.press(seconds[seconds.length - 1] as never))
    await frames()
    expect(told.at(-1)).toEqual(['activate', { previous: 'one', value: 'two' }])
  })
})
