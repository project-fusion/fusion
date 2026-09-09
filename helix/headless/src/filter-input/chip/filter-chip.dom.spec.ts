import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, and the import dynamic for that reason:
   `@customElement` runs on import, static imports are hoisted, and an element
   registered against the `customElements` happy-dom then replaces never
   upgrades. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const chip = async (attributes = '', inner = 'refunded'): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-filter-chip ${attributes}>${inner}</helix-headless-filter-chip>`,
  )) as HTMLElement

/**
 * A chip is three segments, and which of them is drawn is the whole design.
 *
 * The rule these hold down is that the comparison appears only where it is worth
 * appearing: a filter set to a field's usual comparison reads as the field and
 * its values, and one set to anything else says so.
 */
describe('the operator segment', () => {
  test('no label, so no segment, and the chip reads as field and values', async () => {
    const el = await chip('label="Disposition" name="disposition" operator="any"')
    expect(part(el, 'operator')).toBeNull()
    expect(part(el, 'field')).not.toBeNull()
    expect(part(el, 'values')).not.toBeNull()
  })

  test('a label, so the segment, because somebody chose this comparison', async () => {
    const el = await chip(
      'label="Category" name="category" operator="none" operator-label="is none of"',
    )
    expect(part(el, 'operator')?.textContent).toContain('is none of')
  })

  /* A control slotted into `operator` is a comparison a reader can change, and
     it has to be drawn whether or not there is a word to sit beside it. */
  test('a slotted control draws the segment with no label at all', async () => {
    const el = (await mount(
      `<helix-headless-filter-chip label="Category" name="category">
         <button slot="operator">is none of</button>Services
       </helix-headless-filter-chip>`,
    )) as HTMLElement
    expect(part(el, 'operator')).not.toBeNull()
  })
})

describe('what a chip carries back', () => {
  /* The model's names, not the reader's words. A consumer matches on these, so
     translating a label has to leave them alone. */
  test('the names reflect, so a consumer can select the filter they mean', async () => {
    const el = await chip('name="disposition" operator="any" label="Disposition"')
    expect(el.getAttribute('name')).toBe('disposition')
    expect(el.getAttribute('operator')).toBe('any')
  })

  /* A reflected property with a default writes an attribute on upgrade the
     server never wrote, which is a hydration mismatch before anybody has touched
     the page. */
  test('and write no attribute at all until something sets them', async () => {
    const el = await chip()
    expect(el.hasAttribute('name')).toBe(false)
    expect(el.hasAttribute('operator')).toBe(false)
  })
})

describe('asking for a filter to go', () => {
  test('there is no control until the chip is dismissible', async () => {
    const el = await chip('label="Disposition"')
    expect(part(el, 'dismiss')).toBeNull()
  })

  /* Dismissing is a request and never an act: the chip is the consumer's element
     in a consumer's list, and refusing is how they take the decision. */
  test('pressing it announces, and refusing takes the decision', async () => {
    const el = await chip('label="Disposition" dismissible')
    let asked = 0
    el.addEventListener('helix-dismiss', (event) => {
      asked += 1
      event.preventDefault()
    })
    ;(part(el, 'dismiss') as HTMLButtonElement | null)?.click()
    expect(asked).toBe(1)
    // Refused, so the chip is still exactly where the consumer put it.
    expect(el.isConnected).toBe(true)
  })

  test('the control says what it removes, so several chips are told apart', async () => {
    const el = await chip('label="Disposition" dismissible dismiss-label="Remove disposition"')
    expect(part(el, 'dismiss')?.getAttribute('aria-label')).toBe('Remove disposition')
  })
})

/* `is empty` is a filter that carries no values and never will, so the chip for
   one is a field and a word. Drawn unconditionally the box was still there, and
   the gap either side of it read as a step of dead space after the word. */
describe('a chip with nothing to compare against', () => {
  test('draws no values box, where one with values does', async () => {
    const withValues = (await mount(
      `<helix-headless-filter-chip label="Disposition">refunded</helix-headless-filter-chip>`,
    )) as HTMLElement
    expect(withValues.shadowRoot?.querySelector('[part="values"]')).not.toBeNull()

    const without = (await mount(
      `<helix-headless-filter-chip label="Assignee" operator-label="is empty"></helix-headless-filter-chip>`,
    )) as HTMLElement
    expect(without.shadowRoot?.querySelector('[part="values"]')).toBeNull()
    // The word it does carry is still there, which is the whole chip.
    expect(without.shadowRoot?.querySelector('[part="operator"]')?.textContent?.trim()).toBe(
      'is empty',
    )
  })

  test('and something slotted with no text of its own still counts as a value', async () => {
    const marked = (await mount(
      `<helix-headless-filter-chip label="Owner"><span></span></helix-headless-filter-chip>`,
    )) as HTMLElement
    expect(marked.shadowRoot?.querySelector('[part="values"]')).not.toBeNull()
  })
})
