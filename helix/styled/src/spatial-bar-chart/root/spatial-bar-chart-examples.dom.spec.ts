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
  run('new numbers in the table give the chart new readings, which the bars move to', async () => {
    await example(taking_new_data)
    const chart = document.querySelector('helix-spatial-bar-chart') as HTMLElement & {
      field: unknown
    }
    const before = chart.field
    expect(before).toBeTruthy()
    press('Refresh data')
    await idle()
    expect(chart.field).not.toBe(before)
  })
})
