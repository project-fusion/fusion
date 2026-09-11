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
  run('pressing one proposes it, announces it, commits it and selects it', async () => {
    await example(events)
    const roomy = document.querySelector('helix-toggle[value="lg"]') as HTMLElement
    ;(part(roomy, 'item') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change', 'helix-select'])
  })
})
