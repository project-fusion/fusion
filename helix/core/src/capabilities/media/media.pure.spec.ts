import { afterEach, describe, expect, test } from 'bun:test'
import { fakeMedia } from './fake.js'
import { media, STILL_PLAYBACK, setMedia } from './index.js'
import { serverMedia } from './server.js'

afterEach(() => {
  setMedia(serverMedia)
})

describe('media', () => {
  test('is the server implementation until one is set', () => {
    expect(media()).toBe(serverMedia)
  })

  test('plays nothing on the server', async () => {
    expect(await serverMedia.play('player')).toBe(false)
    expect(await serverMedia.fullscreen('player', true)).toBe(false)
    expect(await serverMedia.pictureInPicture('player', true)).toBe(false)
    expect(serverMedia.read('player')).toEqual(STILL_PLAYBACK)
    expect(serverMedia.captions('player')).toEqual([])
  })

  test('the fake plays, pauses, and seeks as a player does, telling each observer', async () => {
    const fake = fakeMedia<string>()
    setMedia(fake)
    const heard: boolean[] = []
    const stop = media().observe('player', (playback) => heard.push(playback.paused))
    fake.place('player', { duration: 30 })
    expect(await media().play('player')).toBe(true)
    media().seek('player', 45)
    expect(media().read('player')).toMatchObject({ paused: false, time: 30 })
    media().pause('player')
    stop()
    media().mute('player', true)
    expect(heard).toEqual([true, false, false, true])
    expect(fake.calls.map((one) => one.call)).toEqual(['play', 'seek', 'pause', 'mute'])
  })

  test('the fake refuses a play where a spec says the platform does', async () => {
    const fake = fakeMedia<string>()
    fake.plays = false
    expect(await fake.play('player')).toBe(false)
    expect(fake.read('player').paused).toBe(true)
  })

  test('the fake keeps the caption tracks a spec gives, and each request to show one', () => {
    const fake = fakeMedia<string>()
    fake.tracks('player', [{ id: 'en', label: 'English', language: 'en' }])
    expect(fake.captions('player')).toEqual([{ id: 'en', label: 'English', language: 'en' }])
    fake.showCaptions('player', 'en')
    fake.nowPlaying('player', { title: 'Sintel' })
    expect(fake.calls).toEqual([
      { call: 'captions', id: 'en', node: 'player' },
      { call: 'now-playing', node: 'player', shown: { title: 'Sintel' } },
    ])
  })
})
