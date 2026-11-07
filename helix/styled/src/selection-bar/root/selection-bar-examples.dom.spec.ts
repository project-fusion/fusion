import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../data-table/index.js')
  await import('../../input/index.js')
  await import('../../table/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('shows the bar for the two selected rows, and Clear brings the toolbar back', async () => {
    await example(preview)
    await idle()
    const table = document.querySelector('helix-data-table') as HTMLElement
    const bar = document.querySelector('helix-selection-bar') as HTMLElement
    expect(bar.shadowRoot?.querySelector('[part="count"]')?.textContent).toBe('2 selected')
    bar.shadowRoot?.querySelector<HTMLElement>('[part="clear"]')?.click()
    await idle()
    expect(table.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="toolbar"]')?.hidden).toBe(
      false,
    )
  })
})
