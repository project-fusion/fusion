import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Card = Updatable & { x: number; y: number }

describe('the controlled example', () => {
  run('a move asks, and the page puts the card on the ruling itself', async () => {
    await example(controlled)
    const plan = document.getElementById('plan') as Updatable
    const doing = document.getElementById('doing') as Card
    /* Shift and an arrow asks for sixteen units, half a square. The page
       refuses it and rounds to the square, so the card lands one square on
       rather than between two lines. */
    doing.shadowRoot?.querySelector('[part="node"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowRight',
        shiftKey: true,
      }),
    )
    await settle(plan)
    expect(doing.x).toBe(288)
    expect(doing.y).toBe(0)
  })
})
