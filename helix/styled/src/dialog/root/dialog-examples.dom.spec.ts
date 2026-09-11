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

/* A reader's press lands on the button inside, which is the element the
   platform's invoker commands read `commandfor` from. A click dispatched on the
   host reaches its listeners and never that button. */
const press = (host: Element | null): void => {
  ;((host?.shadowRoot?.querySelector('button') ?? host) as HTMLElement).click()
}

describe('the events example', () => {
  run('the page refuses the first close and lets the second through', async () => {
    await example(events)
    const dialog = document.getElementById('unsaved') as HTMLElement & { open: boolean }
    press(document.querySelector('[command="--show"]'))
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    const close = document.querySelector('[command="--close"]')
    press(close)
    await idle()
    expect(dialog.open).toBe(true)
    press(close)
    await idle()
    expect(dialog.open).toBe(false)
    expect(logged()).toEqual([
      'helix-before-open',
      'toggle',
      'helix-before-close',
      'helix-before-close',
      'toggle',
      'close',
    ])
  })
})
