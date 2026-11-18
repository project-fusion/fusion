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
  run('Advance moves the bar on, and its number comes to rest on the new value', async () => {
    await example(counting)
    const upload = document.getElementById('upload') as HTMLElement & { value: number }
    press('Advance')
    await idle()
    expect(upload.value).toBeGreaterThan(24)
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(upload.shadowRoot?.textContent).toContain(`${upload.value}%`)
  })
})
