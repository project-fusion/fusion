import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('sorted by name as asked, four to a page', async () => {
    await example(preview)
    await idle()
    const objects = document.getElementById('objects') as HTMLElement
    const rows = [...(objects.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])]
    expect(rows).toHaveLength(4)
    expect(rows[0]?.querySelector('[part~="cell"]')?.textContent?.trim()).toBe('archive.tar.gz')
  })
})
