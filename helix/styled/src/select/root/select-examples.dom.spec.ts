import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import long_list from '../.examples/long-list.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../option/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* An option answers a press on its own row, inside its shadow root. */
const choose = (option: Element | null | undefined): void => {
  ;(option?.shadowRoot?.querySelector('[part~="item"]') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('choosing a plan proposes it, commits it, and the list closes', async () => {
    await example(events)
    ;(part(document.getElementById('choice') as HTMLElement, 'trigger') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    choose(document.querySelector('helix-option[value="team"]'))
    await idle()
    expect(logged().slice(2)).toEqual([
      'helix-before-change',
      'input',
      'change',
      'helix-before-close',
      'toggle',
    ])
  })
})

describe('the long-list example', () => {
  /* Ten thousand options handed over as data: the closed trigger steps over
     them, and the open list draws a screenful. */
  run('steps over the records from the trigger and draws a window of them', async () => {
    await example(long_list)
    const accounts = document.getElementById('accounts') as HTMLElement & { value: string }
    const trigger = part(accounts, 'trigger') as HTMLElement
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    )
    await idle()
    expect(accounts.value).toBe('account-1')
    expect(part(accounts, 'value')?.textContent?.trim()).toBe('Account 00001')
    trigger.click()
    await idle()
    const list = part(accounts, 'listbox') as HTMLElement
    const drawn = list.shadowRoot?.querySelectorAll('helix-option') ?? []
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.length).toBeLessThan(50)
  })
})
