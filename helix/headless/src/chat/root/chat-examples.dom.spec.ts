import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

describe('the preview example', () => {
  run('sending a message puts it in the conversation as the reader wrote it', async () => {
    await example(preview)
    const composer = document.querySelector('helix-headless-chat-composer') as HTMLElement
    const before = document.querySelectorAll('helix-headless-chat-message').length
    type(part(composer, 'field') as HTMLTextAreaElement, 'Is it the lock on the jobs table?')
    await idle()
    ;(part(composer, 'send') as HTMLElement).click()
    await idle()
    const turns = document.querySelectorAll('helix-headless-chat-message')
    expect(turns).toHaveLength(before + 1)
    expect(turns[turns.length - 1]?.textContent?.trim()).toBe('Is it the lock on the jobs table?')
  })
})
