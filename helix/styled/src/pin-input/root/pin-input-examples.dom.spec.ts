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

/* A reader arrives in the first box and types a character a box, which is what
   moves the component's own focus along the row. */
const enter = async (host: HTMLElement, text: string): Promise<void> => {
  const cells = [...(host.shadowRoot?.querySelectorAll<HTMLInputElement>('[part~="cell"]') ?? [])]
  cells[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
  for (const [at, character] of [...text].entries()) {
    const cell = cells[at] as HTMLInputElement
    cell.value = character
    cell.dispatchEvent(new Event('input', { bubbles: true }))
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
