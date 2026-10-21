import { describe, expect, test } from 'bun:test'
import type { SpeechEngine, SpeechListener } from '@fusion.dev/helix-core'
import { fallbackSpeech } from './fallback-speech.js'

/** An engine that records each listening and lets a spec answer it. */
const engine = (available = true) => {
  const listeners: SpeechListener[] = []
  let stops = 0
  const fake: SpeechEngine = {
    available: () => available,
    listen: ({ listener }) => {
      listeners.push(listener)
      return {
        stop: () => {
          stops += 1
        },
      }
    },
  }
  return { fake, listeners, stops: () => stops }
}

/** A listener that records what it is told, in order. */
const record = () => {
  const told: string[] = []
  const listener: SpeechListener = {
    end: (reason, message) => told.push(`end ${reason}${message ? ` ${message}` : ''}`),
    final: (text) => told.push(`final ${text}`),
    partial: (text) => told.push(`partial ${text}`),
  }
  return { listener, told }
}

describe('fallbackSpeech', () => {
  test('listens through the first engine where it works', () => {
    const first = engine()
    const second = engine()
    const { listener, told } = record()
    fallbackSpeech(first.fake, second.fake).listen({ lang: 'en-US', listener })
    first.listeners[0]?.partial('hel')
    first.listeners[0]?.final('hello')
    first.listeners[0]?.end('stopped')
    expect(told).toEqual(['partial hel', 'final hello', 'end stopped'])
    expect(second.listeners).toHaveLength(0)
  })

  test('the same press moves to the second engine when the first has no service', () => {
    const first = engine()
    const second = engine()
    const { listener, told } = record()
    const both = fallbackSpeech(first.fake, second.fake)
    both.listen({ lang: 'en-US', listener })
    first.listeners[0]?.end('error', 'network')
    expect(told).toEqual([])
    second.listeners[0]?.final('hello')
    expect(told).toEqual(['final hello'])

    both.listen({ lang: 'en-US', listener: record().listener })
    expect(first.listeners).toHaveLength(1)
    expect(second.listeners).toHaveLength(2)
  })

  test('a refused microphone ends the listening, and the next press tries the first engine again', () => {
    const first = engine()
    const second = engine()
    const { listener, told } = record()
    const both = fallbackSpeech(first.fake, second.fake)
    both.listen({ lang: 'en-US', listener })
    first.listeners[0]?.end('error', 'not-allowed')
    expect(told).toEqual(['end error not-allowed'])
    both.listen({ lang: 'en-US', listener })
    expect(first.listeners).toHaveLength(2)
    expect(second.listeners).toHaveLength(0)
  })

  test('an error after the first engine heard something ends the listening', () => {
    const first = engine()
    const second = engine()
    const { listener, told } = record()
    fallbackSpeech(first.fake, second.fake).listen({ lang: 'en-US', listener })
    first.listeners[0]?.partial('hel')
    first.listeners[0]?.end('error', 'network')
    expect(told).toEqual(['partial hel', 'end error network'])
    expect(second.listeners).toHaveLength(0)
  })

  test('the second engine listens where the first is not available', () => {
    const first = engine(false)
    const second = engine()
    const both = fallbackSpeech(first.fake, second.fake)
    expect(both.available()).toBe(true)
    both.listen({ lang: 'en-US', listener: record().listener })
    expect(first.listeners).toHaveLength(0)
    expect(second.listeners).toHaveLength(1)
  })

  test('stopping reaches the engine listening now', () => {
    const first = engine()
    const second = engine()
    const session = fallbackSpeech(first.fake, second.fake).listen({
      lang: 'en-US',
      listener: record().listener,
    })
    first.listeners[0]?.end('error', 'network')
    session.stop()
    expect(first.stops()).toBe(0)
    expect(second.stops()).toBe(1)
  })
})
