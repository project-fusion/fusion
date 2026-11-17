import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../text/index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the sliding number example', () => {
  run('Add a sale raises the count, and the number read is the new one', async () => {
    await example(preview)
    const sales = document.getElementById('sales') as HTMLElement & {
      value: number
      updateComplete: Promise<unknown>
    }
    const before = sales.value
    ;(document.getElementById('sell') as HTMLElement).click()
    await idle()
    await sales.updateComplete
    expect(sales.value).toBeGreaterThan(before)
    expect(sales.shadowRoot?.querySelector('[data-spoken]')?.textContent).toBe(
      sales.value.toLocaleString('en-US'),
    )
  })
})
