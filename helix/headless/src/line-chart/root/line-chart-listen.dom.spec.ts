import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** The tones each fake context started, as their frequencies in hertz. */
let started: number[] = []

/** A Web Audio context that plays nothing and says what it was asked to play. */
class FakeContext {
  currentTime = 0
  destination = {}
  sampleRate = 8000
  private node(extra: object = {}) {
    return { connect: (next: unknown) => next, ...extra }
  }
  close() {
    return Promise.resolve()
  }
  createBiquadFilter() {
    return this.node({ frequency: { value: 0 }, type: '' })
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) }
  }
  createBufferSource() {
    return this.node({ buffer: null, start: () => {}, stop: () => {} })
  }
  createGain() {
    return this.node({
      gain: { linearRampToValueAtTime: () => {}, setValueAtTime: () => {}, value: 0 },
    })
  }
  createOscillator() {
    const frequency = { value: 0 }
    return this.node({
      frequency,
      start: () => started.push(frequency.value),
      stop: () => {},
      type: 'sine',
    })
  }
  createStereoPanner() {
    return this.node({ pan: { value: 0 } })
  }
  resume() {
    return Promise.resolve()
  }
}

const TABLE = `<table id="sales">
  <caption>Sales</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Sales</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="0">0</td></tr>
    <tr><th scope="row">Feb</th><td data-value="50">50</td></tr>
    <tr><th scope="row">Mar</th><td data-value="100">100</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & {
  listenDuration: number
  playReadings(): Promise<void>
  sounding: boolean
  stopReadings(): void
  updateComplete: Promise<unknown>
}

const chart = async (attributes = 'listen'): Promise<Chart> => {
  await mount(
    `<div>${TABLE}<helix-headless-line-chart for="sales" ${attributes}></helix-headless-line-chart></div>`,
  )
  const host = document.querySelector('helix-headless-line-chart') as Chart
  await host.updateComplete
  await host.updateComplete
  return host
}

const key = (host: HTMLElement, name: string): void => {
  const plot = part(host, 'plot') ?? host
  plot.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )
}

/* A browser has a real `AudioContext`, which would play: a test that wants
   none takes it away, one that listens puts a fake in, and each puts the
   browser's own back after. Only the hooks the browser runner also has. */
const audio = globalThis as { AudioContext?: unknown }
const real = audio.AudioContext

afterEach(() => {
  if (real === undefined) {
    delete audio.AudioContext
  } else {
    audio.AudioContext = real
  }
  started = []
})

describe('a chart that listens', () => {
  test('draws no Listen button where the browser has no audio, or without listen', async () => {
    delete audio.AudioContext
    expect(part(await chart(), 'listen')).toBeNull()
    ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
    expect(part(await chart(''), 'listen')).toBeNull()
  })

  test('plays every reading as a pitch from the lowest value to the highest, and stops', async () => {
    ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
    const host = await chart()
    host.listenDuration = 30
    const button = part(host, 'listen') as HTMLElement
    expect(button.textContent?.trim()).toBe('Listen')
    button.click()
    await host.updateComplete
    expect(host.sounding).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(started.map(Math.round)).toEqual([220, 440, 880])
    host.stopReadings()
    await host.updateComplete
    expect(host.sounding).toBe(false)
  })

  test('plays a reading’s tone as the arrow keys step to it, and the chart on L', async () => {
    ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext
    const host = await chart()
    key(host, 'ArrowRight')
    await host.updateComplete
    key(host, 'ArrowRight')
    await host.updateComplete
    expect(started.map(Math.round)).toEqual([220, 440])
    started = []
    key(host, 'l')
    await host.updateComplete
    expect(host.sounding).toBe(true)
    key(host, 'Escape')
    await host.updateComplete
    expect(host.sounding).toBe(false)
  })
})
