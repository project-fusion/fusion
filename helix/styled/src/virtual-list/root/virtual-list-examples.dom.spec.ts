import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import loadingMore from '../.examples/loading-more.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('two thousand rows draw only the handful on screen, first row first', async () => {
    await example(preview)
    await idle()
    const drawn = document.querySelectorAll('.virtualRow')
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.length).toBeLessThan(200)
    expect(drawn[0]?.textContent).toContain('Row 1')
  })
})

describe('the loading more example', () => {
  run('draws links from the array, and adds a page near the end', async () => {
    await example(loadingMore)
    await idle()
    const list = document.getElementById('files') as HTMLElement & { items: unknown[] }
    const link = list.querySelector('[data-index="0"] a')
    expect(link?.textContent).toBe('report-1.pdf')
    expect(link?.getAttribute('href')).toBe('#report-1')
    const viewport = list.shadowRoot?.querySelector('[part="viewport"]') as HTMLElement
    viewport.scrollTop = viewport.scrollHeight
    await idle()
    await idle()
    expect(list.items.length).toBe(400)
  })
})
