import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import complete from '../.examples/complete.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* A reader arrives in the field and types a character at a time, which is
   what the one field holds after each keystroke. */
const enter = async (host: HTMLElement, text: string): Promise<void> => {
  const field = host.shadowRoot?.querySelector<HTMLInputElement>('[part~="control"]')
  field?.dispatchEvent(new FocusEvent('focus'))
  for (const at of [...text].keys()) {
    if (field) {
      field.value = text.slice(0, at + 1)
      field.setSelectionRange(at + 1, at + 1)
      field.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await idle()
  }
}

describe('the events example', () => {
  run('the last character completes the code, and the commit follows it', async () => {
    await example(events)
    await enter(document.getElementById('code') as HTMLElement, '482913')
    expect(logged().slice(-2)).toEqual(['helix-complete', 'change'])
  })
})

describe('the complete example', () => {
  run('filling every box is what the page hears about', async () => {
    await example(complete)
    const host = document.querySelector('helix-pin-input') as HTMLElement & { hint: string }
    await enter(host, '482913')
    expect(host.hint).toBe('Checking 482913')
  })
})
