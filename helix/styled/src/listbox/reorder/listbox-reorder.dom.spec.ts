import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { CSSResult } from 'lit'

/* Imported after registration, as every element is, so Lit reads the DOM the
   specs run in. */
let styles: CSSResult
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
  await import('./index.js')
  ;({ styles } = await import('./listbox-reorder.css.js'))
})

type Listbox = Updatable & { highlight(where: 'first'): void; reorderable: boolean }

const lists: HTMLElement[] = []
afterEach(() => {
  for (const one of lists.splice(0)) {
    one.remove()
  }
})

const make = async (extra = 'reorderable'): Promise<Listbox> => {
  const list = (await mount(`<helix-listbox label="Order" manual ${extra}>
    <helix-option value="a">Alpha</helix-option>
    <helix-option value="b">Beta</helix-option>
  </helix-listbox>`)) as Listbox
  lists.push(list)
  await settle(list)
  await settle(list)
  return list
}

/* Whether an option holds the sheet the entry hands it. happy-dom resolves no
   cascade, so what can be held here is that the sheet is there and what it
   says, rather than that it applied: the line where an option lands is
   measured in Chromium. */
const adopted = (option: Element): boolean =>
  (option.shadowRoot?.adoptedStyleSheets ?? []).includes(styles.styleSheet as CSSStyleSheet)

const options = (list: HTMLElement): HTMLElement[] => [
  ...list.querySelectorAll<HTMLElement>('helix-option'),
]

describe('a reorderable styled listbox', () => {
  test('hands each option the sheet that draws a move, and takes it back when it stops', async () => {
    const list = await make()
    const [alpha] = options(list) as [HTMLElement]
    expect(adopted(alpha)).toBe(true)
    list.reorderable = false
    await settle(list)
    await settle(list)
    expect(adopted(alpha)).toBe(false)
  })

  test('hands nothing to the options of a list that does not reorder', async () => {
    const list = await make('')
    expect(adopted(options(list)[0] as HTMLElement)).toBe(false)
  })

  test('draws a grab cursor, a faded option, and a line where it lands, through the family hooks', () => {
    const text = styles.cssText
    expect(text).toContain('* {cursor: grab;}')
    expect(text).toContain('opacity: var(--listbox-dragging-opacity, 0.5)')
    expect(text).toContain('var(--listbox-drop-indicator-color, var(--helix-color-primary))')
    expect(text).toContain('var(--listbox-drop-indicator-size, var(--helix-border-thick))')
    /* On the option's host, whose ::after is free, since its row's ::after is a
       chosen option's check mark. */
    expect(text).toContain(':host(:state(drop-after))::before {inset-block-end: 0;}')
  })

  test('moves the highlighted option with Alt and Down, and says so', async () => {
    const list = await make()
    list.addEventListener('helix-reorder', (event) => {
      const keys = (event as CustomEvent<{ keys: string[] }>).detail.keys
      list.append(...keys.map((key) => list.querySelector(`[value="${key}"]`) as Element))
    })
    list.highlight('first')
    await settle(list)
    ;(part(list, 'items') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowDown',
      }),
    )
    await settle(list)
    expect(options(list).map((one) => one.getAttribute('value'))).toEqual(['b', 'a'])
    expect(part(list, 'live')?.textContent?.trim()).toBe('Alpha moved to position 2 of 2')
  })
})
