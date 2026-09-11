import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import shortcut from '../.examples/shortcut.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../input/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* The key a reader presses with the cursor in the field, which is where
   `within="control"` listens. */
const slash = (): void => {
  const field = document.querySelector('helix-input') as HTMLElement
  const control = part(field, 'control') as HTMLInputElement
  control.focus()
  control.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: '/' }),
  )
}

describe('the events example', () => {
  run('slash in the field is the shortcut, and it is heard', async () => {
    await example(events)
    slash()
    await idle()
    expect(logged()).toEqual(['helix-shortcut'])
  })
})

describe('the shortcut example', () => {
  run('the page says what it heard', async () => {
    await example(shortcut)
    slash()
    await idle()
    expect(document.getElementById('said')?.textContent).toContain('Heard')
  })
})
