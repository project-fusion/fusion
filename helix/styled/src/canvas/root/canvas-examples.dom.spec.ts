import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import editing from '../.examples/editing.html' with { type: 'text' }

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

describe('the editing example', () => {
  /** A key pressed on a card, from the box a reader focuses. */
  const press = (id: string, key: string): void => {
    document
      .getElementById(id)
      ?.shadowRoot?.querySelector('[part="node"]')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
  }

  run('C on one card and Enter on another, and the page adds the connection', async () => {
    await example(editing)
    const launch = document.getElementById('launch') as Updatable
    press('demo', 'c')
    await settle(launch)
    press('ship', 'Enter')
    await settle(launch)
    const made = launch.querySelector('#made-1')
    expect(made?.getAttribute('from')).toBe('demo')
    expect(made?.getAttribute('to')).toBe('ship')
  })

  run('Delete on a card, and the page takes it and the connection it stranded', async () => {
    await example(editing)
    const launch = document.getElementById('launch') as Updatable
    press('post', 'Delete')
    await settle(launch)
    expect(document.getElementById('post')).toBeNull()
    expect(document.getElementById('post-ship')).toBeNull()
  })
})
