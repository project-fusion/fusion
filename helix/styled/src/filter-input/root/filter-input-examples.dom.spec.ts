import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import arity from '../.examples/arity.html' with { type: 'text' }
import picking from '../.examples/picking.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import typing from '../.examples/typing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../icon/index.js')
  await import('../../menu/index.js')
  await import('../../option/index.js')
})

/**
 * The examples, run: their markup, their script, and a reader's presses.
 *
 * **The component can be right and the example wrong.** These three build the
 * chips themselves, from `helix-facet`, because the field leaves its tokens to
 * whoever owns the page. One of them added two chips for a single pick, since a
 * reflected `name` lands on the next update and the script's lookup ran before
 * it. Every spec passed, because none of them ran the script.
 *
 * Browser only: happy-dom does not run a script inserted by script.
 */
const run = hasLayout() ? test : (): void => {}

type Menu = HTMLElement & { valuesFor: (field: string) => readonly string[] }

const menu = (): Menu => document.querySelector('helix-filter-menu') as Menu
const filter = (): HTMLElement => document.getElementById('filter') as HTMLElement
const chips = (field: string): HTMLElement[] => [
  ...filter().querySelectorAll<HTMLElement>(`helix-filter-chip[name="${field}"]`),
]

/* The picker's rows say what they are in their `data-` attributes, so a press
   reaches the row a reader would have without opening a page to find it.

   **Presses do not wait for each other.** The double chip needed two facets in
   one frame, before the first chip had updated: pressed one at a time, with
   the page settling between, the broken script passes. So a spec presses as
   fast as a reader can, and settles once when it is done. */
const press = (kind: string, field: string, value: string): void => {
  const row = menu().shadowRoot?.querySelector(
    `[data-facet="${kind}"][data-field="${field}"][data-value="${value}"]`,
  ) as (HTMLElement & { select?: () => void }) | null
  expect(row?.select).toBeDefined()
  row?.select?.()
}

const settled = async (): Promise<void> => {
  await settle(menu())
  await settle(filter())
  await Promise.all(
    [...filter().querySelectorAll('helix-filter-chip')].map((one) => settle(one as HTMLElement)),
  )
}

const EXAMPLES = [
  ['arity', arity],
  ['picking', picking],
  ['typing', typing],
] as const

for (const [name, file] of EXAMPLES) {
  describe(`the ${name} example`, () => {
    run('a field filtered is one chip, however many values it holds', async () => {
      await example(file)
      press('value', 'disposition', 'refunded')
      press('value', 'disposition', 'chargeback')
      await settled()
      expect(chips('disposition')).toHaveLength(1)
      expect(chips('disposition')[0]?.textContent).toBe('refunded, chargeback')
    })

    run('the close on a chip takes the filter, and the ticks with it', async () => {
      await example(file)
      press('value', 'disposition', 'refunded')
      await settled()
      const close = part(chips('disposition')[0] as HTMLElement, 'dismiss') as HTMLElement
      close.click()
      await settled()
      expect(chips('disposition')).toHaveLength(0)
      expect(menu().valuesFor('disposition')).toEqual([])
    })
  })
}

describe('the arity example', () => {
  /* The pick that went double: a comparison taking one value, where each press
     replaces the value and the chip has to follow rather than multiply. */
  run('a comparison taking one value keeps one chip as the pick changes', async () => {
    await example(arity)
    press('value', 'created', 'today')
    press('value', 'created', 'week')
    await settled()
    expect(chips('created')).toHaveLength(1)
    expect(chips('created')[0]?.textContent).toBe('week')
  })

  run('a comparison taking none is a chip with no values', async () => {
    await example(arity)
    press('operator', 'assignee', 'empty')
    await settled()
    expect(chips('assignee')).toHaveLength(1)
    expect(chips('assignee')[0]?.textContent).toBe('')
  })
})

describe('the typing example', () => {
  run('Enter builds the chip the picker would have, and ticks it', async () => {
    await example(typing)
    const control = part(filter(), 'control') as HTMLInputElement
    control.value = 'disposition:refunded'
    control.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
    )
    control.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Enter',
      }),
    )
    await settled()
    expect(chips('disposition')).toHaveLength(1)
    expect(menu().valuesFor('disposition')).toEqual(['refunded'])
  })
})

/* No picker here: the chips are the page's own markup, and the page's script
   takes whichever one asks to go. Both ways of asking have to reach it. */
describe('the preview example', () => {
  const field = (): HTMLElement => document.querySelector('helix-filter-input') as HTMLElement
  const names = (): Array<string | null> =>
    [...field().querySelectorAll('helix-filter-chip')].map((one) => one.getAttribute('name'))

  run('the close on a chip takes that chip', async () => {
    await example(preview)
    const env = field().querySelector('helix-filter-chip[name="env"]') as HTMLElement
    ;(part(env, 'dismiss') as HTMLElement).click()
    await settle(field())
    expect(names()).toEqual(['owner', 'status', 'area'])
  })

  run('Backspace on the empty field takes the last', async () => {
    await example(preview)
    part(field(), 'control')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Backspace',
      }),
    )
    await settle(field())
    expect(names()).toEqual(['owner', 'env', 'status'])
  })
})
