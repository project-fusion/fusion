import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../option/index.js')
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
const key = (target: HTMLElement, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )
}

/* An option answers a press on its own row, inside its shadow root. */
const choose = (option: Element | null | undefined): void => {
  ;(option?.shadowRoot?.querySelector('[part~="item"]') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('typing narrows the list and opens it, and choosing commits and closes', async () => {
    await example(events)
    const language = document.getElementById('language') as HTMLElement & { value: string }
    const control = part(language, 'control') as HTMLInputElement
    type(control, 'ru')
    await idle()
    expect(logged()).toEqual(['helix-filter', 'helix-before-open', 'toggle'])
    choose(document.querySelector('helix-option[value="rust"]'))
    await idle()
    expect(language.value).toBe('rust')
    expect(logged().slice(-5)).toEqual([
      'helix-before-change',
      'input',
      'change',
      'helix-before-close',
      'toggle',
    ])
  })

  run('a word the list does not have asks to be created', async () => {
    await example(events)
    const control = part(
      document.getElementById('language') as HTMLElement,
      'control',
    ) as HTMLInputElement
    type(control, 'Zig')
    await idle()
    key(control, 'Enter')
    await idle()
    expect(logged()).toContain('helix-create')
  })
})
