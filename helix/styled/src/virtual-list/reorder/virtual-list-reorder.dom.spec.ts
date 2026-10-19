import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { CSSResult } from 'lit'

/* Imported after registration, as every element is, so Lit reads the DOM the
   specs run in. */
let styles: CSSResult
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('./index.js')
  ;({ styles } = await import('./virtual-list-reorder.css.js'))
})

type List = Updatable & { items: unknown[] | undefined; reorderable: boolean }

afterEach(() => {
  document.body.replaceChildren()
})

const make = async (extra = 'reorderable'): Promise<List> => {
  document.body.innerHTML = `<helix-virtual-list label="Order" ${extra}><template><div data-field="name"></div></template></helix-virtual-list>`
  const list = document.body.firstElementChild as List
  list.items = [{ name: 'Alpha' }, { name: 'Beta' }]
  await settle(list)
  await settle(list)
  return list
}

/* Whether the list holds the sheet the entry hands it. happy-dom resolves no
   cascade, so what is held here is that the sheet is there and what it says. */
const held = (list: HTMLElement): boolean =>
  (list.shadowRoot?.adoptedStyleSheets ?? []).includes(styles.styleSheet as CSSStyleSheet)

describe('a reorderable styled virtual list', () => {
  test('holds the sheet that draws a move only while it reorders', async () => {
    const list = await make()
    expect(held(list)).toBe(true)
    list.reorderable = false
    await settle(list)
    await settle(list)
    expect(held(list)).toBe(false)
    expect(held(await make(''))).toBe(false)
  })

  test('draws a faded row, a line where it lands, and a raised copy, through the family hooks', () => {
    const text = styles.cssText
    expect(text).toContain('opacity: var(--virtual-list-dragging-opacity, 0.5)')
    expect(text).toContain('var(--virtual-list-drop-indicator-color, var(--helix-color-primary))')
    expect(text).toContain('var(--virtual-list-drag-preview-shadow, var(--helix-shadow-floating))')
  })
})
