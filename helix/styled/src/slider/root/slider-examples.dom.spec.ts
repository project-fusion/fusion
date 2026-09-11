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

/* What a reader's typing looks like to the control: the value changes, then
   `input` fires. `change` is the commit, which a browser sends on blur. */
const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}
const commit = (control: HTMLElement): void => {
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('the events example', () => {
  run('dragging proposes and announces, and letting go commits', async () => {
    await example(events)
    const control = part(
      document.getElementById('quality') as HTMLElement,
      'control',
    ) as HTMLInputElement
    type(control, '60')
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input'])
    commit(control)
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
  })
})
