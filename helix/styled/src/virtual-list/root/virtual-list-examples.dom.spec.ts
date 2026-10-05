import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import choosing from '../.examples/choosing.html' with { type: 'text' }
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

describe('the choosing example', () => {
  run('starts with two people chosen, and Space and Shift with Down take in more', async () => {
    await example(choosing)
    await idle()
    const list = document.getElementById('people') as HTMLElement & { value: string }
    expect(list.value).toBe('p3,p4')
    expect(list.querySelector('[data-index="2"]')?.getAttribute('aria-selected')).toBe('true')
    const first = list.querySelector('[data-index="0"]') as HTMLElement
    first.focus()
    const press = async (key: string, init: KeyboardEventInit = {}) => {
      ;(document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }),
      )
      await idle()
    }
    await press(' ')
    expect(list.value).toBe('p1,p3,p4')
    await press('ArrowDown', { shiftKey: true })
    expect(list.value).toBe('p1,p2,p3,p4')
  })
})
