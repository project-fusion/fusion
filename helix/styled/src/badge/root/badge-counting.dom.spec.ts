import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import counting from '../.examples/counting.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/** Presses the example's button with these words. */
const press = (words: string): void => {
  const button = [...document.querySelectorAll('helix-button')].find(
    (one) => one.textContent?.trim() === words,
  )
  ;(button as HTMLElement).click()
}

describe('the counting example', () => {
  run('a new message raises the count, and the button says it', async () => {
    await example(counting)
    press('Receive a message')
    await idle()
    expect((document.getElementById('unread') as HTMLElement & { value: string }).value).toBe('4')
    expect(document.getElementById('inbox')?.getAttribute('aria-label')).toBe('Inbox, 4 unread')
  })
})
