import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('the trigger opens it and closes it, asking each time', async () => {
    await example(events)
    const trigger = document.querySelector('#details > helix-button') as HTMLElement
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle', 'helix-before-close', 'toggle'])
  })
})
