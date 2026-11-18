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
  run('new numbers in the table redraw the bands', async () => {
    await example(taking_new_data)
    const chart = document.querySelector('helix-area-chart') as HTMLElement
    const area = (): string | null | undefined =>
      chart.shadowRoot?.querySelector('[part~="area"]')?.getAttribute('d')
    const before = area()
    expect(before).toBeTruthy()
    press('Refresh data')
    await idle()
    expect(area()).not.toBe(before)
  })
})
