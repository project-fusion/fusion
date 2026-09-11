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
  run('a row with no page under it is a choice', async () => {
    await example(events)
    const account = document.querySelector('helix-drilldown-item[value="account"]') as HTMLElement
    ;(part(account, 'item') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-select'])
  })

  run('and a row with one is a way in, not a choice', async () => {
    await example(events)
    const appearance = document.querySelector(
      'helix-drilldown-item[value="appearance"]',
    ) as HTMLElement
    ;(part(appearance, 'item') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual([])
    const theme = document.querySelector('helix-drilldown-item[value="theme"]') as HTMLElement
    ;(part(theme, 'item') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-select'])
  })
})
