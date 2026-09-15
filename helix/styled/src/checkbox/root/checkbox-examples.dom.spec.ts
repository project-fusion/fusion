import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  logged,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* **Settled after the press, and not idled.** A click runs the control's
   activation in the task it lands in: every event it sends, and every listener
   the example keeps, has run before `click()` returns. What is left is the
   box's own update. The six frames once waited on top of it bought nothing, and
   a busy run could not always find them inside the two seconds a test gets. */
describe('the events example', () => {
  run('ticking it proposes the state, then announces it, then commits it', async () => {
    await example(events)
    const box = document.getElementById('box') as Updatable
    ;(part(box, 'control') as HTMLElement).click()
    await settle(box)
    expect(logged()).toEqual(['helix-before-toggle', 'input', 'change'])
  })
})

describe('the controlled example', () => {
  run('a press asks, and the page answers by assigning what was asked', async () => {
    await example(controlled)
    const box = document.querySelector('helix-checkbox') as Updatable & { checked: boolean }
    const before = box.checked
    ;(part(box, 'control') as HTMLElement).click()
    await settle(box)
    expect(box.checked).toBe(!before)
  })
})
