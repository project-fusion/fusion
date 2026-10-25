import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../scroll-area/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  /* The event is the section being read, derived from the Scroll Area the
     sections are in, so it arrives once the scroll a press started has
     settled, a moment after the press. The outline draws a link for each
     section. */
  run('pressing a heading brings its section into reading, and says so', async () => {
    await example(events)
    await idle()
    const api = document.querySelector('#rail a[href="#api"]') as HTMLAnchorElement
    api.click()
    await new Promise((done) => setTimeout(done, 900))
    await idle()
    expect(logged().at(-1)).toBe('helix-activate')
  })
})
