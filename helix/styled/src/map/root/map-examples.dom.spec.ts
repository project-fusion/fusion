import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import wired from '../.examples/wired.html' with { type: 'text' }

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
