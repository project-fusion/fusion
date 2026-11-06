import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import editing from '../.examples/editing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the editing example', () => {
  run(
    'opens an amount in the inline field, keeps the row its height, and refuses one under zero',
    async () => {
      await example(editing)
      await idle()
      const table = document.querySelector('helix-data-table') as unknown as HTMLElement & {
        editCell: (row: unknown, field: string) => boolean
        rows: Record<string, unknown>[]
      }
      const cell = table.shadowRoot?.querySelector<HTMLElement>(
        '[data-row="0"] > [data-column="2"]',
      )
      const before = cell?.getBoundingClientRect().height
      table.editCell(table.rows[0], 'amount')
      await idle()
      const editor = table.shadowRoot?.querySelector<HTMLElement & { value: string }>(
        '[part="editor"]',
      )
      expect(editor?.getAttribute('emphasis')).toBe('ghost')
      expect(cell?.getBoundingClientRect().height).toBe(before)
      if (editor) {
        editor.value = '-40'
        editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        editor.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }),
        )
      }
      await idle()
      expect(table.shadowRoot?.querySelector('[part="cell-message"]')?.textContent).toBe(
        'Enter 0 or more.',
      )
    },
  )
})
