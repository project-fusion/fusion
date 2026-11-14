import { describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import type * as ExpoVideo from 'expo-video'
import { MediaView } from '../render/media-view'
import { type MediaNode, nativeMedia } from './media'

/** A player as `expo-video` makes one, which a spec moves as its media would. */
class MockPlayer {
  availableSubtitleTracks = [
    { id: 'en', label: 'English', language: 'en' },
    { label: 'Français', language: 'fr' },
  ]
  currentTime = 0
  duration = 30
  listeners = new Map<string, Set<() => void>>()
  muted = false
  playing = false
  showNowPlayingNotification = false
  source: unknown
  status = 'readyToPlay'
  subtitleTrack: unknown = null
  timeUpdateEventInterval = 0
  constructor(source: unknown) {
    this.source = source
  }
  addListener(name: string, listener: () => void) {
    const heard = this.listeners.get(name) ?? new Set()
    this.listeners.set(name, heard)
    heard.add(listener)
    return { remove: () => heard.delete(listener) }
  }
  emit(name: string) {
    for (const one of this.listeners.get(name) ?? []) {
      one()
    }
  }
  pause() {
    this.playing = false
  }
  play() {
    this.playing = true
  }
}

const mockMade: MockPlayer[] = []

jest.mock('expo-video', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    isPictureInPictureSupported: () => true,
    useVideoPlayer: (source: unknown) => {
      const { useMemo } = jest.requireActual<typeof import('react')>('react')
      return useMemo(() => {
        const player = new MockPlayer(source)
        mockMade.push(player)
        return player
      }, [source])
    },
    VideoView: View,
  }
})

/** A player and a view that fullscreen and picture in picture go through. */
const nodeOf = (player = new MockPlayer({ uri: 'clip.mp4' })) => {
  const view = {
    enterFullscreen: jest.fn(async () => undefined),
    exitFullscreen: jest.fn(async () => undefined),
    startPictureInPicture: jest.fn(async () => undefined),
    stopPictureInPicture: jest.fn(async () => undefined),
  }
  const node = {
    player: player as unknown as ExpoVideo.VideoPlayer,
    shown: null,
    view: view as unknown as ExpoVideo.VideoView,
  } as MediaNode
  return { node, player, view }
}

describe('nativeMedia', () => {
  test('plays, pauses, seeks within the media, and mutes it', async () => {
    const { node, player } = nodeOf()
    expect(await nativeMedia.play(node)).toBe(true)
    expect(nativeMedia.read(node)).toMatchObject({ duration: 30, paused: false })
    nativeMedia.seek(node, 45)
    expect(player.currentTime).toBe(30)
    nativeMedia.pause(node)
    nativeMedia.mute(node, true)
    expect(nativeMedia.read(node)).toMatchObject({ ended: true, muted: true, paused: true })
  })

  test('a player that failed to load plays nothing, and says so', async () => {
    const { node, player } = nodeOf()
    player.status = 'error'
    expect(await nativeMedia.play(node)).toBe(false)
    expect(nativeMedia.read(node).failed).toBe(true)
  })

  test('tells an observer each move, about four times a second while it plays, until stopped', () => {
    const { node, player } = nodeOf()
    const heard: number[] = []
    const stop = nativeMedia.observe(node, (playback) => heard.push(playback.time))
    expect(player.timeUpdateEventInterval).toBe(0.25)
    player.currentTime = 3
    player.emit('timeUpdate')
    stop()
    player.emit('timeUpdate')
    expect(heard).toEqual([3])
  })

  test('fullscreen and picture in picture go through the view', async () => {
    const { node, view } = nodeOf()
    expect(await nativeMedia.fullscreen(node, true)).toBe(true)
    expect(view.enterFullscreen).toHaveBeenCalled()
    expect(await nativeMedia.pictureInPicture(node, false)).toBe(true)
    expect(view.stopPictureInPicture).toHaveBeenCalled()
    expect(await nativeMedia.fullscreen({ ...node, view: null }, true)).toBe(false)
  })

  test('lists the caption tracks the media carries, and shows the one named', () => {
    const { node, player } = nodeOf()
    expect(nativeMedia.captions(node)).toEqual([
      { id: 'en', label: 'English', language: 'en' },
      { id: 'fr-1', label: 'Français', language: 'fr' },
    ])
    nativeMedia.showCaptions(node, 'fr-1')
    expect(player.subtitleTrack).toBe(player.availableSubtitleTracks[1])
    nativeMedia.showCaptions(node, null)
    expect(player.subtitleTrack).toBeNull()
  })

  test('the now-playing controls show what it plays, and leave once it is null', () => {
    const { node, player } = nodeOf()
    nativeMedia.nowPlaying(node, { title: 'Sintel' })
    expect(player.showNowPlayingNotification).toBe(true)
    expect(node.shown).toEqual({ title: 'Sintel' })
    nativeMedia.nowPlaying(node, null)
    expect(player.showNowPlayingNotification).toBe(false)
  })
})

describe('MediaView', () => {
  test('makes a player for its source with what the now-playing controls show, and hands it over', async () => {
    const handed: (MediaNode | null)[] = []
    const view = await render(
      <MediaView
        handle={(node) => handed.push(node)}
        nowPlaying={{ artist: 'Blender', title: 'Sintel' }}
        source="https://example.com/sintel.mp4"
      />,
    )
    expect(mockMade.at(-1)?.source).toEqual({
      metadata: { artist: 'Blender', title: 'Sintel' },
      uri: 'https://example.com/sintel.mp4',
    })
    expect(handed.at(-1)?.player).toBe(mockMade.at(-1) as never)
    await view.unmount()
    expect(handed.at(-1)).toBeNull()
  })
})
