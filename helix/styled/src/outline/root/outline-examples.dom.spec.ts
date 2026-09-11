import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import eventsSheet from '../.examples/events.css' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  /* The event is the section being read, derived from the scroll container
     the example's own sheet makes of the reading pane, so it arrives once the
     scroll a press started has settled rather than with the press. */
  run('pressing a heading brings its section into reading, and says so', async () => {
    await example(events, eventsSheet)
    const api = document.querySelector('#rail a[href="#api"]') as HTMLAnchorElement
    api.click()
    await new Promise((done) => setTimeout(done, 900))
    await idle()
    expect(logged().at(-1)).toBe('helix-before-activate')
  })
})
