import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import unsaved from '../.examples/unsaved.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
  await import('../../text/index.js')
  await import('../../textarea/index.js')
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
  run('opening and closing it ask, move, and close under the platform name', async () => {
    await example(events)
    press(document.querySelector('[command="--show"]'))
    await idle()
    press(document.querySelector('[command="--close"]'))
    await idle()
    expect(logged()).toEqual([
      'helix-before-open',
      'toggle',
      'helix-before-close',
      'toggle',
      'close',
    ])
  })
})

describe('the unsaved example', () => {
  run('an unsaved note keeps the sheet open, and Save closes it', async () => {
    await example(unsaved)
    press(document.querySelector('[command="--show"]'))
    await idle()
    const note = document.getElementById('note') as HTMLElement & { close(): void; open: boolean }
    const text = document.getElementById('note-text') as HTMLElement & { value: string }
    text.value = 'Buy milk'
    note.close()
    await idle()
    expect(note.open).toBe(true)
    press(document.getElementById('note-save'))
    await idle()
    expect(note.open).toBe(false)
  })
})
