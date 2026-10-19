import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import undo from '../.examples/undo.html' with { type: 'text' }

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
  run("a message's close control asks, and the page hears it", async () => {
    await example(events)
    const failed = [...document.querySelectorAll('helix-toast-item')][1] as HTMLElement
    ;(part(failed, 'dismiss') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-dismiss'])
  })
})

describe('the undo example', () => {
  run('archives a file at once, and Undo puts it back where it was', async () => {
    await example(undo)
    const files = document.getElementById('files') as HTMLElement
    ;(files.querySelector('[data-archive]') as HTMLElement).click()
    await idle()
    expect(files.querySelectorAll('helix-list-item').length).toBe(1)
    const message = document.querySelector('helix-toast-item') as HTMLElement
    ;(message.querySelector('[slot="actions"]') as HTMLElement).click()
    await idle()
    const names = [...files.querySelectorAll('helix-list-item')].map((row) =>
      row.firstChild?.textContent?.trim(),
    )
    expect(names).toEqual(['Quarterly report.pdf', 'Roadmap.key'])
  })
})
