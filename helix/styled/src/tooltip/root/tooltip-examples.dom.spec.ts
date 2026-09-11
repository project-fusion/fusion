import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('focus opens it at once, and leaving closes it', async () => {
    await example(events)
    /* On the button inside, which is what a Tab lands on and what matches
       `:focus-visible`. Its host never does, which kept this tooltip shut for
       every keyboard reader until the tooltip learned to look inside. */
    const button = document
      .getElementById('events-deploy')
      ?.shadowRoot?.querySelector('button') as HTMLElement
    button.focus({ focusVisible: true } as FocusOptions)
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    button.blur()
    await new Promise((done) => setTimeout(done, 300))
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle', 'helix-before-close', 'toggle'])
  })
})
