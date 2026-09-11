import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../card/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('moving to the next slide and back selects each', async () => {
    await example(events)
    const slides = document.getElementById('slides') as HTMLElement & { index: number }
    ;(part(slides, 'next') as HTMLElement).click()
    await idle()
    expect(slides.index).toBe(1)
    ;(part(slides, 'previous') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-select', 'helix-select'])
    expect(slides.index).toBe(0)
  })
})

describe('the controlled example', () => {
  run('a move asks, and the page moves the slide it holds', async () => {
    await example(controlled)
    const reel = document.getElementById('reel') as HTMLElement & { index: number }
    ;(part(reel, 'next') as HTMLElement).click()
    await idle()
    expect(reel.index).toBe(2)
  })
})
