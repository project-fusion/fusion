import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('exports the three invoices, and asks the table first', async () => {
    await example(preview)
    await idle()
    const panel = document.querySelector('helix-table-export') as HTMLElement
    const table = document.querySelector('helix-data-table') as HTMLElement
    let count = 0
    table.addEventListener('helix-before-export', (event) => {
      count = event.detail.count
      event.preventDefault()
    })
    const button = panel.shadowRoot?.querySelector<HTMLElement>('[part="export"]')
    expect(button?.textContent?.trim()).toBe('Export 3 rows')
    button?.click()
    expect(count).toBe(3)
  })
})
