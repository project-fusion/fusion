import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import board from '../.examples/board.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/** A part inside the board's own shadow root. */
const inside = (part: string): HTMLElement | null =>
  (document
    .getElementById('board')
    ?.shadowRoot?.querySelector(`[part="${part}"]`) as HTMLElement) ?? null

describe('the board example', () => {
  run('the document the page set is what gets drawn', async () => {
    /* The example sets `data` from a script, which is the shape a consumer with
       a `.canvas` file uses: read it, set it, and the board is in the markup. */
    await example(board)
    await idle()
    expect(
      document.getElementById('board')?.shadowRoot?.querySelectorAll('[part="card"]'),
    ).toHaveLength(4)
    expect(
      document.getElementById('board')?.shadowRoot?.querySelectorAll('[part="edge"]'),
    ).toHaveLength(2)
  })

  run('choosing a card in the reading list brings the board to it', async () => {
    await example(board)
    await idle()
    const before = inside('board')?.getAttribute('style')
    const entries = [
      ...(document.getElementById('board')?.shadowRoot?.querySelectorAll('[part="index-item"]') ??
        []),
    ] as HTMLElement[]
    const ship = entries.find((one) => (one.textContent ?? '').includes('Tag and publish'))
    ship?.click()
    await idle()
    expect(inside('board')?.getAttribute('style')).not.toBe(before)
  })

  run('a press on the pad moves the board, a canvas drawing its own', async () => {
    await example(board)
    await idle()
    const before = inside('board')?.getAttribute('style')
    ;(inside('pan-end') as HTMLElement).click()
    await idle()
    expect(inside('board')?.getAttribute('style')).not.toBe(before)
  })
})
