import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import fallback from '../.examples/fallback.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* Waits for what an example's own timer or the network brings, up to a bound,
   so a spec reads the settled page rather than a guess at how long it takes. */
const until = async (ready: () => boolean, bound = 6000): Promise<void> => {
  const started = performance.now()
  while (!ready() && performance.now() - started < bound) {
    await new Promise((done) => setTimeout(done, 50))
  }
}

describe('the events example', () => {
  run('a picture that cannot arrive says so', async () => {
    await example(events)
    await until(() => logged().includes('error'))
    expect(logged()).toContain('error')
  })
})

/* The sheet hid a broken picture with `visibility: hidden`, which took its `alt`
   out of the accessibility tree with it, and the fallback is `aria-hidden`: a
   broken picture said nothing at all. A broken native image still says its
   `alt`. */
describe('the fallback example', () => {
  run('a picture that failed keeps its description for a screen reader', async () => {
    await example(fallback)
    const host = document.querySelector('helix-image') as HTMLElement
    await until(() => host.getAttribute('data-status') === 'error')
    const image = host.shadowRoot?.querySelector('[part="image"]') as HTMLElement
    expect(getComputedStyle(image).visibility).toBe('visible')
    expect(getComputedStyle(image).opacity).toBe('0')
    expect(image.getAttribute('alt')).toBe('A road winding below highland cliffs at sunset')
  })
})
