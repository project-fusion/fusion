import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled_filter from '../.examples/controlled-filter.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../option/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* What a reader's typing looks like to the control: the value changes, then
   `input` fires. `change` is the commit, which a browser sends on blur. */
const type = (control: HTMLInputElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

/* An option answers a press on its own row, inside its shadow root. */
const choose = (option: Element | null | undefined): void => {
  ;(option?.shadowRoot?.querySelector('[part="item"]') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('typing filters, and choosing proposes, announces and commits', async () => {
    await example(events)
    const search = part(
      document.getElementById('regions') as HTMLElement,
      'search-field',
    ) as HTMLInputElement
    type(search, 'fr')
    await idle()
    expect(logged()).toEqual(['helix-filter'])
    choose(document.querySelector('helix-option[value="fra"]'))
    await idle()
    expect(logged()).toEqual(['helix-filter', 'helix-before-change', 'input', 'change'])
  })
})

describe('the controlled-filter example', () => {
  /* The page answers the request by writing the filter, so what narrows the
     list is the page's own text. Until the example was made `filterable` its
     handler answered an event nothing on the page could send. */
  run('typing asks, and the page narrows the list with what was asked', async () => {
    await example(controlled_filter)
    const zones = document.getElementById('zones') as HTMLElement & { filter: string }
    type(part(zones, 'search-field') as HTMLInputElement, 'ber')
    await idle()
    expect(zones.filter).toBe('ber')
    const shown = [...document.querySelectorAll<HTMLElement>('helix-option')].filter(
      (one) => !one.hidden,
    )
    expect(shown.map((one) => one.getAttribute('value'))).toEqual(['berlin'])
  })
})
