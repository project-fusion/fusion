import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('choosing a file proposes the list, announces it and commits it', async () => {
    await example(events)
    const control = part(
      document.getElementById('files') as HTMLElement,
      'control',
    ) as HTMLInputElement
    const transfer = new DataTransfer()
    transfer.items.add(new File(['x'], 'diagram.png', { type: 'image/png' }))
    control.files = transfer.files
    control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    control.dispatchEvent(new Event('change', { bubbles: true }))
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
  })
})
