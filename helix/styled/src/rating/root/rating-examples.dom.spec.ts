import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
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
  run('choosing a score proposes it, announces it and commits it', async () => {
    await example(events)
    const score = document.getElementById('score') as HTMLElement & { value: string }
    const options = score.shadowRoot?.querySelectorAll<HTMLElement>('[part~="option"]') ?? []
    options[4]?.click()
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
    expect(score.value).toBe('5')
  })
})
