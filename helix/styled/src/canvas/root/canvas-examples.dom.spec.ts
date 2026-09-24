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

/** A card or a connection on a board, by the name the board knows it by. */
const named = (board: Element, name: string): HTMLElement | null =>
  board.querySelector(`[name="${name}"]`)

/** A key pressed on a card, from the box a reader focuses. */
const press = (board: Element, name: string, key: string, shiftKey = false): void => {
  named(board, name)
    ?.shadowRoot?.querySelector('[part="node"]')
    ?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key,
        shiftKey,
      }),
    )
}

describe('the controlled example', () => {
  run('a move asks, and the page puts the card on the ruling itself', async () => {
    await example(controlled)
    const plan = document.getElementById('plan') as Updatable
    /* Shift and an arrow asks for sixteen units, half a square. The page
       refuses it and rounds to the square, so the card lands one square on
       rather than between two lines. */
    press(plan, 'doing', 'ArrowRight', true)
    await settle(plan)
    const doing = named(plan, 'doing') as Card
    expect(doing.x).toBe(288)
    expect(doing.y).toBe(0)
  })
})

describe('the editing example', () => {
  run('C on one card and Enter on another, and the page adds the connection', async () => {
    await example(editing)
    const launch = document.getElementById('launch') as Updatable
    press(launch, 'demo', 'c')
    await settle(launch)
    press(launch, 'ship', 'Enter')
    await settle(launch)
    const made = named(launch, 'made-1')
    expect(made?.getAttribute('from')).toBe('demo')
    expect(made?.getAttribute('to')).toBe('ship')
  })

  run('Delete on a card, and the page takes it and the connection it stranded', async () => {
    await example(editing)
    const launch = document.getElementById('launch') as Updatable
    press(launch, 'post', 'Delete')
    await settle(launch)
    expect(named(launch, 'post')).toBeNull()
    expect(named(launch, 'post-ship')).toBeNull()
  })

  run('Delete on a connection, and the page takes that connection alone', async () => {
    await example(editing)
    const launch = document.getElementById('launch') as Updatable
    launch.shadowRoot?.querySelector('[data-edge="edge:post-ship"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Delete',
      }),
    )
    await settle(launch)
    expect(named(launch, 'post-ship')).toBeNull()
    expect(named(launch, 'post')).not.toBeNull()
    expect(named(launch, 'ship')).not.toBeNull()
  })
})
