import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('code block', () => {
  test('renders pre wrapping code, which is what a block of code is', async () => {
    const el = await mount('<helix-headless-code-block>one</helix-headless-code-block>')
    const block = el.shadowRoot?.querySelector('[part="block"]')
    expect([block?.tagName, block?.firstElementChild?.tagName]).toEqual(['PRE', 'CODE'])
  })

  test('draws no header when there is nothing to put in it', async () => {
    const el = await mount('<helix-headless-code-block no-copy>one</helix-headless-code-block>')
    expect(el.shadowRoot?.querySelector('[part="header"]')).toBeNull()
  })

  /* The copy value comes from the slot, not a property, so there is no second
     copy of the code to go stale. */
  test('copies what was slotted', async () => {
    const el = await mount(
      '<helix-headless-code-block>bun add @helix-io/styled</helix-headless-code-block>',
    )
    /* Twice. The slot is empty on the first render, because assignment happens
       after it; `slotchange` then schedules the update that fills the button.
       One `updateComplete` catches the render that has nothing in it. */
    await el.updateComplete
    await el.updateComplete
    const copy = el.shadowRoot?.querySelector('helix-headless-copy-button') as HTMLElement & {
      value: string
    }
    expect(copy.value).toBe('bun add @helix-io/styled')
  })
})
