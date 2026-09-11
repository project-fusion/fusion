import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled_month from '../.examples/controlled-month.html' with { type: 'text' }
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
  run('paging the month navigates, and choosing a day commits it', async () => {
    await example(events)
    const calendar = document.getElementById('calendar') as HTMLElement & { value: string }
    ;(part(calendar, 'next') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-navigate'])
    const cells = [
      ...(calendar.shadowRoot?.querySelectorAll<HTMLElement>(
        '[part~="cell"]:not([data-outside])',
      ) ?? []),
    ]
    cells[14]?.click()
    await idle()
    expect(logged()).toEqual(['helix-navigate', 'helix-before-change', 'input', 'change'])
    expect(calendar.value).not.toBe('')
  })
})

describe('the controlled-month example', () => {
  run('paging asks, and the page moves the month it holds', async () => {
    await example(controlled_month)
    const calendar = document.querySelector('helix-date-picker') as HTMLElement & { month: string }
    const before = calendar.month
    ;(part(calendar, 'next') as HTMLElement).click()
    await idle()
    expect(calendar.month).not.toBe(before)
  })
})
