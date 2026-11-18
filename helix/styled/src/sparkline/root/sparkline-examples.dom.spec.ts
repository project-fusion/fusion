import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import taking_new_data from '../.examples/taking-new-data.html' with { type: 'text' }

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

describe('the taking-new-data example', () => {
  run('Next day drops the oldest day and adds a new one, keeping seven', async () => {
    await example(taking_new_data)
    const visitors = document.getElementById('visitors') as HTMLElement
    press('Next day')
    await idle()
    const days = visitors.getAttribute('values')?.split(' ') ?? []
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('1318')
    expect(days[5]).toBe('1408')
  })
})
