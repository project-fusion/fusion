import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../listbox/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* An option answers a press on its own row, inside its shadow root. */
const choose = (option: Element | null | undefined): void => {
  ;(option?.shadowRoot?.querySelector('[part~="item"]') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('choosing an option is heard from the option itself', async () => {
    await example(events)
    choose(document.querySelector('helix-option[value="grace"]'))
    await idle()
    expect(logged()).toEqual(['helix-select'])
  })
})
