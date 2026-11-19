import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import growing_in from '../.examples/growing-in.html' with { type: 'text' }

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

describe('the growing-in example', () => {
  run('adding a day takes in the new day and lets the oldest go', async () => {
    await example(growing_in)
    const chart = document.querySelector('helix-spatial-heatmap') as HTMLElement
    const overview = (): string | null | undefined =>
      chart.shadowRoot?.querySelector('[part="overview"]')?.textContent
    const before = overview()
    expect(before).toBeTruthy()
    press('Add a day')
    await idle()
    expect(overview()).not.toBe(before)
  })
})
