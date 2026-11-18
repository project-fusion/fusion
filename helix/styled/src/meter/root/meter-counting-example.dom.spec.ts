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
  run('Measure again takes a new reading, and the number comes to rest on it', async () => {
    await example(counting)
    const disk = document.getElementById('disk') as HTMLElement & { value: number }
    press('Measure again')
    await idle()
    expect(disk.value).toBeGreaterThanOrEqual(10)
    expect(disk.value).toBeLessThanOrEqual(95)
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(disk.shadowRoot?.textContent).toContain(`${disk.value}%`)
  })
})
