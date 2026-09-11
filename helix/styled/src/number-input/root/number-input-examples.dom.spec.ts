import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
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
  run('a step proposes the value, announces it and commits it at once', async () => {
    await example(events)
    const guests = document.getElementById('guests') as HTMLElement & { value: string }
    ;(part(guests, 'increment') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
    expect(guests.value).toBe('4')
  })
})
