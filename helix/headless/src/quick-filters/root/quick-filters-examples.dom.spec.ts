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
  run('counts each preset, and Overdue narrows the table to its two invoices', async () => {
    await example(preview)
    await idle()
    const row = document.querySelector('helix-headless-quick-filters') as HTMLElement
    const table = document.querySelector('helix-headless-data-table') as HTMLElement & {
      matched: number
    }
    const presets = [...(row.shadowRoot?.querySelectorAll<HTMLElement>('[part~="preset"]') ?? [])]
    expect(presets.map((one) => one.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 4',
      'Overdue 2',
      'Paid 2',
    ])
    presets[1]?.click()
    await idle()
    expect(table.matched).toBe(2)
    expect(presets[1]?.getAttribute('aria-pressed')).toBe('true')
  })
})
