import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
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

describe('the events example', () => {
  run('ticking it proposes the state, then announces it, then commits it', async () => {
    await example(events)
    ;(part(document.getElementById('box') as HTMLElement, 'control') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-toggle', 'input', 'change'])
  })
})

describe('the controlled example', () => {
  run('a press asks, and the page answers by assigning what was asked', async () => {
    await example(controlled)
    const box = document.querySelector('helix-checkbox') as HTMLElement & { checked: boolean }
    const before = box.checked
    ;(part(box, 'control') as HTMLElement).click()
    await idle()
    expect(box.checked).toBe(!before)
  })
})
