import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../checkbox/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('ticking a scope proposes the set, then announces it, then commits it', async () => {
    await example(events)
    const write = document.querySelector('helix-checkbox[value="write"]') as HTMLElement
    ;(part(write, 'control') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
  })
})
