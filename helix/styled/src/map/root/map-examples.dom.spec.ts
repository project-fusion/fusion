import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import wired from '../.examples/events.html' with { type: 'text' }
import points from '../.examples/points.html' with { type: 'text' }
import weather from '../.examples/weather.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/** A press on one of the frame's own controls, which live in its shadow root. */
const press = (frame: Element | null, part: string): void => {
  ;(frame?.shadowRoot?.querySelector(`[part="${part}"]`) as HTMLElement | null)?.click()
}

/** What the example's script writes back onto the stand-in it moves. */
const shifted = (): { x: string; y: string; zoom: string } => {
  const ground = document.getElementById('ground') as HTMLElement
  const read = ground.style
  return {
    x: read.getPropertyValue('--_shift-x'),
    y: read.getPropertyValue('--_shift-y'),
    zoom: read.getPropertyValue('--_zoom'),
  }
}

describe('the wired example', () => {
  run('a press on the pan pad moves what the page answered with', async () => {
    /* The point of the example is the contract: the frame asks and the page
       moves its own map. So what this asserts is the answer, not the request. */
    await example(wired)
    const frame = document.getElementById('wired')
    press(frame, 'pan-end')
    await idle()
    expect(shifted().x).not.toBe('0px')

    press(frame, 'pan-down')
    await idle()
    expect(shifted().y).not.toBe('0px')
  })

  run('a press on zoom changes the scale rather than the position', async () => {
    await example(wired)
    const frame = document.getElementById('wired')
    press(frame, 'zoom-in')
    await idle()
    const after = shifted()
    expect(Number(after.zoom)).toBeGreaterThan(1)
    expect(after.x).toBe('0px')
  })

  run('the arrow keys reach the same answer the buttons do', async () => {
    await example(wired)
    const frame = document.getElementById('wired') as HTMLElement
    const region = frame.shadowRoot?.querySelector('[part="region"]') as HTMLElement
    region.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }))
    await idle()
    expect(shifted().y).not.toBe('0px')
  })
})

describe('the points example', () => {
  run('its script hands the layer the places it draws, each named', async () => {
    /* The renderer is what draws them, which a spec has none of: what the
       example owes is the data, set on the layer as a page would set its own. */
    await example(points)
    const layer = document.getElementById('places') as HTMLElement & {
      data?: { label: string; lat: number; lng: number }[]
    }
    expect(layer.data).toHaveLength(2400)
    expect(layer.data?.[0]?.label).toBe('Place 1')
    expect(layer.data?.every((one) => Number.isFinite(one.lat) && Number.isFinite(one.lng))).toBe(
      true,
    )
  })
})

describe('the weather example', () => {
  run('the button plays the radar loop, then pauses it, and says which it will do', async () => {
    await example(weather)
    const radar = document.getElementById('radar') as HTMLElement & { playing: boolean }
    const toggle = document.getElementById('toggle') as HTMLElement
    expect(radar.playing).toBe(false)
    expect(toggle.textContent?.trim()).toBe('Play radar')
    toggle.click()
    await idle()
    expect(radar.playing).toBe(true)
    expect(toggle.textContent?.trim()).toBe('Pause radar')
    toggle.click()
    await idle()
    expect(radar.playing).toBe(false)
  })
})
