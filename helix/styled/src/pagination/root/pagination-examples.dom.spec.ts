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
  run('moving a page is one request, and it moves the page', async () => {
    await example(events)
    const pages = document.getElementById('pages') as HTMLElement & { page: number }
    ;(part(pages, 'next') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-navigate'])
    expect(pages.page).toBe(5)
  })
})
