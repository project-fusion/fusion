import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../icon/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('the trigger opens the dial, and an action selects and closes it', async () => {
    await example(events)
    ;(part(document.getElementById('dial') as HTMLElement, 'trigger') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    const upload = document.querySelector('helix-speed-dial-item[value="upload"]') as HTMLElement
    ;(upload.shadowRoot?.querySelector('button') as HTMLElement | null)?.click()
    await idle()
    expect(logged()).toEqual([
      'helix-before-open',
      'toggle',
      'helix-select',
      'helix-before-close',
      'toggle',
    ])
  })
})
