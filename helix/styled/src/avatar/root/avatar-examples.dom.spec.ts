import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

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
  run('a picture that cannot arrive says so, and the avatar keeps its initials', async () => {
    await example(events)
    await until(() => logged().includes('error'))
    expect(logged()).toContain('error')
    await idle()
    const missing = [...document.querySelectorAll('helix-avatar')][1] as HTMLElement
    expect(missing.shadowRoot?.textContent).toContain('GH')
  })
})
