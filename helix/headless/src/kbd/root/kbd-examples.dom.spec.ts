import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import shortcut from '../.examples/shortcut.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../input/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the shortcut example', () => {
  run('slash in the field is heard, and the page says so', async () => {
    await example(shortcut)
    const field = document.querySelector('helix-headless-input') as HTMLElement
    const control = part(field, 'control') as HTMLInputElement
    control.focus()
    control.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: '/' }),
    )
    await idle()
    expect(document.getElementById('said')?.textContent).toContain('Heard')
  })
})
