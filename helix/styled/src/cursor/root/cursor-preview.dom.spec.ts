import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the cursor example', () => {
  run('moves each pointer to a new place inside the board', async () => {
    await example(preview)
    const ada = document.getElementById('ada') as HTMLElement & { x: number; y: number }
    const board = document.getElementById('board') as HTMLElement
    const before = `${ada.x} ${ada.y}`
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(`${ada.x} ${ada.y}`).not.toBe(before)
    expect(ada.x).toBeLessThanOrEqual(board.clientWidth)
  })
})
