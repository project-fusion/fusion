import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('choosing an item selects it, and the menu closes behind it', async () => {
    await example(events)
    ;(document.querySelector('#actions > helix-button') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    const item = document.querySelector('helix-menu-item[value="duplicate"]') as HTMLElement & {
      select: () => void
    }
    item.select()
    await idle()
    expect(logged()).toEqual([
      'helix-before-open',
      'toggle',
      'helix-select',
      'helix-before-close',
      'toggle',
    ])
  })
})
