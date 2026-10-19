import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import choosing from '../.examples/choosing.html' with { type: 'text' }
import grid from '../.examples/grid.html' with { type: 'text' }
import loadingMore from '../.examples/loading-more.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import waterfall from '../.examples/waterfall.html' with { type: 'text' }

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

describe('the grid example', () => {
  run(
    'draws four cells to a line, and the arrow keys move along a line and down a column',
    async () => {
      await example(grid)
      await idle()
      const list = document.getElementById('swatches') as HTMLElement
      const cell = (at: number) => list.querySelector(`[data-index="${at}"]`) as HTMLElement
      const top = (at: number) => Math.round(cell(at).getBoundingClientRect().top)
      expect(top(3)).toBe(top(0))
      expect(top(4)).toBeGreaterThan(top(0))
      cell(0).focus()
      const press = async (key: string) => {
        ;(document.activeElement as HTMLElement).dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
        )
        await idle()
      }
      await press('ArrowRight')
      await press('ArrowDown')
      expect((document.activeElement as HTMLElement).dataset.index).toBe('5')
    },
  )
})

describe('the waterfall example', () => {
  run('stands each card under the column that ends highest, and Down keeps to it', async () => {
    await example(waterfall)
    await idle()
    await idle()
    const list = document.getElementById('cards') as HTMLElement
    const cards = [...list.querySelectorAll<HTMLElement>('[data-index]')]
      .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
      .slice(0, 9)
      .map((card) => card.getBoundingClientRect())
    const lefts = [...new Set(cards.map((card) => Math.round(card.left)))].sort((a, b) => a - b)
    expect(lefts).toHaveLength(3)
    // Each card's top is the end of the column it went to, eight below the card above.
    const top = Math.min(...cards.map((card) => card.top))
    const ends = [0, 0, 0]
    for (const card of cards) {
      const column = ends.indexOf(Math.min(...ends))
      expect(Math.round(card.left)).toBe(lefts[column] as number)
      expect(Math.abs(card.top - top - (ends[column] as number))).toBeLessThan(1)
      ends[column] = (ends[column] as number) + card.height + 8
    }
    // The cards are different heights, so no line of three ends level.
    expect(new Set(cards.slice(0, 3).map((card) => Math.round(card.height))).size).toBeGreaterThan(
      1,
    )
    ;(list.querySelector('[data-index="0"]') as HTMLElement).focus()
    ;(document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
    )
    await idle()
    const below = (document.activeElement as HTMLElement).getBoundingClientRect()
    expect(Math.round(below.left)).toBe(lefts[0] as number)
  })
})
