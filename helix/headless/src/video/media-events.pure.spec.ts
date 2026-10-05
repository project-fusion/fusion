import { describe, expect, test } from 'bun:test'
import { MEDIA_EVENTS, relayedCopy, relayMedia } from './media-events.js'

const relayed: readonly string[] = MEDIA_EVENTS

describe('the relayed media events', () => {
  /* The five a consumer reaches for first, which were the ones missing: a
     progress readout, a volume indicator, the length once it is known, a speed
     label, and a source that would not play. */
  test('include the ones a page builds its own readout from', () => {
    for (const name of ['timeupdate', 'volumechange', 'loadedmetadata', 'ratechange', 'error']) {
      expect(relayed).toContain(name)
    }
  })

  test('keep the three the player already sent', () => {
    for (const name of ['play', 'pause', 'ended']) {
      expect(relayed).toContain(name)
    }
  })

  /* `reactPropFor` builds a prop from the name, and a hyphen sends it down the
     branch for the library's own events. */
  test('are the platform names, each once, sorted', () => {
    expect([...MEDIA_EVENTS].sort()).toEqual([...MEDIA_EVENTS])
    expect(new Set(MEDIA_EVENTS).size).toBe(MEDIA_EVENTS.length)
    for (const name of MEDIA_EVENTS) {
      expect(name).toMatch(/^[a-z]+$/)
    }
  })
})

describe('a relayed copy', () => {
  /* As the platform sends it. A bubbling copy reaches no React handler, since
     `bindReactHandler` skips a bubbling relay on the grounds that React's own
     root listener already hears it, and for these names React's does not. */
  test('neither bubbles nor composes, and cannot be refused', () => {
    const copy = relayedCopy(new Event('timeupdate', { bubbles: true, composed: true }))
    expect(copy.type).toBe('timeupdate')
    expect(copy.bubbles).toBe(false)
    expect(copy.composed).toBe(false)
    expect(copy.cancelable).toBe(false)
  })
})

describe('relaying', () => {
  test('sends every media event on from the host, and stops when asked', () => {
    const video = new EventTarget()
    const host = new EventTarget()
    const heard: string[] = []
    for (const name of MEDIA_EVENTS) {
      host.addEventListener(name, (event) => heard.push(event.type))
    }
    const stop = relayMedia(video, host)
    for (const name of MEDIA_EVENTS) {
      video.dispatchEvent(new Event(name))
    }
    expect(heard).toEqual([...MEDIA_EVENTS])

    stop()
    video.dispatchEvent(new Event('timeupdate'))
    expect(heard).toHaveLength(MEDIA_EVENTS.length)
  })

  test('and nothing that is not a media event', () => {
    const video = new EventTarget()
    const host = new EventTarget()
    let heard = 0
    host.addEventListener('click', () => {
      heard += 1
    })
    relayMedia(video, host)
    video.dispatchEvent(new Event('click'))
    expect(heard).toBe(0)
  })
})
