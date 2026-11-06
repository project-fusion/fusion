import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
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
  run('shows the hidden column again from its checkbox', async () => {
    await example(preview)
    await idle()
    const manager = document.querySelector('helix-column-manager') as HTMLElement
    const table = document.querySelector('helix-data-table') as HTMLElement & {
      view: { columns: { hidden: string[]; pinned: Record<string, string> } }
    }
    expect(table.view.columns.pinned).toEqual({ id: 'start' })
    const box = manager.shadowRoot?.querySelector<HTMLInputElement>(
      '[data-field="terms"] [part="checkbox"]',
    )
    box?.click()
    await idle()
    expect(table.view.columns.hidden).toEqual([])
    expect(part(manager, 'list')?.children).toHaveLength(5)
  })
})
