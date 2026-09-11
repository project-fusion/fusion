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
const type = (control: HTMLInputElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}
const commit = (control: HTMLElement): void => {
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('the events example', () => {
  run('the wheels open and close, asking each time', async () => {
    await example(events)
    const trigger = part(document.getElementById('at') as HTMLElement, 'trigger') as HTMLElement
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle', 'helix-before-close', 'toggle'])
  })

  run('a time typed in proposes it, announces it, and commits on leaving', async () => {
    await example(events)
    const at = document.getElementById('at') as HTMLElement & { value: string }
    const control = part(at, 'control') as HTMLInputElement
    type(control, '14:30')
    await idle()
    commit(control)
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
    expect(at.value).toBe('14:30')
  })
})
