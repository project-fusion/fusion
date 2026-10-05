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
  /* The toggle's `helix-select` is a request the group reads once every
     listener has had it, so it comes first, ahead of the group's own. */
  run('pressing one asks for it, proposes it, announces it and commits it', async () => {
    await example(events)
    const roomy = document.querySelector('helix-toggle[value="lg"]') as HTMLElement
    ;(part(roomy, 'item') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-select', 'helix-before-change', 'input', 'change'])
  })
})
