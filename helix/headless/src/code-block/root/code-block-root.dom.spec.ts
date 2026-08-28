import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

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
      '<helix-headless-code-block>bun add @fusion.dev/helix</helix-headless-code-block>',
    )
    /* Twice. The slot is empty on the first render, because assignment happens
       after it; `slotchange` then schedules the update that fills the button.
       One `updateComplete` catches the render that has nothing in it. */
    await el.updateComplete
    await el.updateComplete
    const copy = el.shadowRoot?.querySelector('helix-headless-copy-button') as HTMLElement & {
      value: string
    }
    expect(copy.value).toBe('bun add @fusion.dev/helix')
  })
})

/**
 * `no-copy` reaches the host, because the gutter is a rule and not code.
 *
 * **The property alone is half the feature.** `render` reads it and leaves the
 * copy button off, which is visible and looks like the whole job done; the
 * styled tier reserves that button's width with `:host(:not([no-copy]))`, so a
 * block told from script to drop the button kept paying 40px for it. Found by a
 * sweep of every host-attribute selector against whether its property reflects,
 * after the same fault turned up in `avatar-group` and `breadcrumb` by picture.
 */
describe('the no-copy attribute follows the property', () => {
  test('a property write reflects, which is the only way the gutter rule hears it', async () => {
    const el = await mount('<helix-headless-code-block>one</helix-headless-code-block>')
    expect(el.hasAttribute('no-copy')).toBe(false)

    ;(el as HTMLElement & { noCopy: boolean }).noCopy = true
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(el.hasAttribute('no-copy')).toBe(true)
    expect(el.shadowRoot?.querySelector('[part="copy"]')).toBeNull()
  })

  /* The other direction, which is what keeps a reflected boolean honest: false
     is the attribute's absence, so nothing is stamped onto a block that never
     asked. */
  test('and clearing it takes the attribute back off', async () => {
    const el = await mount('<helix-headless-code-block no-copy>one</helix-headless-code-block>')
    expect(el.hasAttribute('no-copy')).toBe(true)

    ;(el as HTMLElement & { noCopy: boolean }).noCopy = false
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(el.hasAttribute('no-copy')).toBe(false)
  })
})
