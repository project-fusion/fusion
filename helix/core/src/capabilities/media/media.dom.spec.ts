import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { fakeMedia } from './fake.js'
import { media, setMedia } from './index.js'
import { serverMedia } from './server.js'
import { installWebMedia, webMedia } from './web.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  setMedia(serverMedia)
})

/** A video whose length and readiness a spec sets, as its media loading would. */
const video = (duration: number): HTMLVideoElement => {
  const node = document.createElement('video')
  Object.defineProperty(node, 'duration', { configurable: true, value: duration })
  return node
}

describe('webMedia', () => {
  test('reads a length the media does not know yet as 0', () => {
    expect(webMedia.read(video(Number.NaN)).duration).toBe(0)
    expect(webMedia.read(video(Number.POSITIVE_INFINITY)).duration).toBe(0)
    expect(webMedia.read(video(12)).duration).toBe(12)
  })

  test('seeks within the media, and mutes it', () => {
    const node = video(20)
    webMedia.seek(node, 50)
    expect(node.currentTime).toBe(20)
    webMedia.seek(node, -4)
    expect(node.currentTime).toBe(0)
    webMedia.mute(node, true)
    expect(webMedia.read(node).muted).toBe(true)
  })

  test('tells an observer where the media stands after each move, until stopped', () => {
    const node = video(20)
    const heard: number[] = []
    const stop = webMedia.observe(node, (playback) => heard.push(playback.time))
    node.currentTime = 4
    node.dispatchEvent(new Event('timeupdate'))
    stop()
    node.dispatchEvent(new Event('timeupdate'))
    expect(heard).toEqual([4])
  })

  test('a play the browser refuses gives false', async () => {
    const node = video(20)
    Object.defineProperty(node, 'play', {
      value: () => Promise.reject(new DOMException('No press yet', 'NotAllowedError')),
    })
    expect(await webMedia.play(node)).toBe(false)
  })

  test('is installed where nothing is set, and leaves a fake in place', () => {
    installWebMedia()
    expect(media()).toBe(webMedia as never)
    const fake = fakeMedia()
    setMedia(fake)
    installWebMedia()
    expect(media()).toBe(fake)
  })
})
