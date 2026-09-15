import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  logged,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
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

type Carousel = Updatable & { index: number }

/* **Settled after each press, and not idled.** A press moves the index in the
   task it lands in and the example's listener writes its row then too, so what
   is left is the carousel's own update, the one that sends the track. Waiting
   frames on top measured nothing and cost six a press, which a busy run could
   not always find inside the two seconds a test gets. */
describe('the events example', () => {
  run('moving to the next slide and back selects each', async () => {
    await example(events)
    const slides = document.getElementById('slides') as Carousel
    ;(part(slides, 'next') as HTMLElement).click()
    await settle(slides)
    expect(slides.index).toBe(1)
    ;(part(slides, 'previous') as HTMLElement).click()
    await settle(slides)
    expect(logged()).toEqual(['helix-select', 'helix-select'])
    expect(slides.index).toBe(0)
  })
})

describe('the controlled example', () => {
  run('a move asks, and the page moves the slide it holds', async () => {
    await example(controlled)
    const reel = document.getElementById('reel') as Carousel
    ;(part(reel, 'next') as HTMLElement).click()
    await settle(reel)
    expect(reel.index).toBe(2)
  })
})
