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
  run('draws the JSON the page holds, two levels open', async () => {
    await example(preview)
    await idle()
    const host = document.querySelector('helix-headless-object-inspector') as HTMLElement
    const rows = [...(host.shadowRoot?.querySelectorAll('[part="row"]') ?? [])]
    expect(rows[0]?.getAttribute('aria-expanded')).toBe('true')
    expect(rows.some((row) => row.textContent?.includes('Ada Okonjo'))).toBe(true)
  })
})
