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
  run('opening a section asks first, then says it moved', async () => {
    await example(events)
    const [deployment] = document.querySelectorAll('helix-accordion-item')
    ;(part(deployment as HTMLElement, 'trigger') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
  })

  run('and closing it again does the same the other way', async () => {
    await example(events)
    const [deployment] = document.querySelectorAll('helix-accordion-item')
    const trigger = part(deployment as HTMLElement, 'trigger') as HTMLElement
    trigger.click()
    await idle()
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle', 'helix-before-close', 'toggle'])
  })
})
