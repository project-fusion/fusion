import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../column-manager/index.js')
  await import('../../data-table/index.js')
  await import('../../quick-filters/index.js')
  await import('../../table/index.js')
  await import('../../table-export/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('says what each section holds, and opens Columns', async () => {
    await example(preview)
    await idle()
    const panel = document.querySelector('helix-view-panel') as HTMLElement
    const sections = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLElement>('[part="section"]') ?? []),
    ]
    expect(sections.map((one) => one.querySelector('[part="summary"]')?.textContent)).toEqual([
      'Due, ascending',
      'Customer, Due, Status',
      '',
    ])
    sections[1]?.click()
    await idle()
    expect(panel.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="columns"]')?.hidden).toBe(
      false,
    )
  })
})
