import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, part, registerDom } from '@fusion.dev/helix-testing/dom'
import pending from '../.examples/pending.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the pending example', () => {
  run('a press makes the button wait, keep focus, and refuse a second press', async () => {
    await example(pending)
    const save = document.getElementById('save') as HTMLElement & { pending: boolean }
    const control = part(save, 'button') as HTMLButtonElement
    let heard = 0
    save.addEventListener('click', () => {
      heard += 1
    })
    control.focus()
    control.click()
    expect(save.pending).toBe(true)
    control.click()
    expect(heard).toBe(1)
    expect(control.getAttribute('aria-busy')).toBe('true')
    expect(save.shadowRoot?.activeElement).toBe(control)
  })
})
