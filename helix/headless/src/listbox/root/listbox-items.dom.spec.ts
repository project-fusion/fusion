import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Listbox = Updatable & {
  items: unknown[] | undefined
  requestFilter(next: string): boolean
  value: string
}

type Row = HTMLElement & { active: boolean; disabled: boolean; selected: boolean; value: string }

/** A list of a thousand options handed over as data. */
const long = async (
  extra = '',
  items: unknown[] = Array.from({ length: 1000 }, (_, at) => `Item ${at}`),
): Promise<Listbox> => {
  /* A height to scroll in, which a list of items needs, in a real engine. */
  document.body.innerHTML = `<style>::part(items) { max-block-size: 200px; overflow: auto }</style>
    <helix-headless-listbox label="L" name="c" ${extra}></helix-headless-listbox>`
  const host = document.body.querySelector('helix-headless-listbox') as Listbox
  host.items = items
  await settle(host)
  await settle(host)
  return host
}

/** The option elements the list drew. */
const rows = (host: Listbox): Row[] => [
  ...((host as HTMLElement).shadowRoot?.querySelectorAll<Row>('helix-headless-option') ?? []),
]

const press = async (host: Listbox, key: string, init: KeyboardEventInit = {}): Promise<void> => {
  host.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }),
  )
  await settle(host)
  await settle(host)
}

/** The element the list's `aria-activedescendant` points at. */
const pointed = (host: Listbox): Element | null =>
  (
    part(host as HTMLElement, 'items') as HTMLElement & {
      ariaActiveDescendantElement: Element | null
    }
  ).ariaActiveDescendantElement

describe('a list of options handed over as data', () => {
  test('draws a window of them, each saying its place in the whole set', async () => {
    /* React Aria's virtualized ListBox: a thousand options, a screenful drawn. */
    const host = await long()
    const drawn = rows(host)
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.length).toBeLessThan(50)
    expect(drawn[0]?.textContent).toBe('Item 0')
    expect(drawn[0]?.getAttribute('aria-posinset')).toBe('1')
    expect(drawn[0]?.getAttribute('aria-setsize')).toBe('1000')
  })

  test('reaches every option from the keyboard, drawing the one it is on', async () => {
    const host = await long()
    await press(host, 'End')
    expect(host.value).toBe('Item 999')
    const last = rows(host).find((row) => row.value === 'Item 999')
    expect(last?.getAttribute('aria-posinset')).toBe('1000')
    expect(last?.active).toBe(true)
    /* An element reference, which happy-dom does not implement. */
    if (hasLayout()) {
      expect(pointed(host)).toBe(last as Row)
    }
    await press(host, 'ArrowDown')
    expect(host.value).toBe('Item 0')
  })

  test('the typeahead searches the whole set', async () => {
    const host = await long('', [
      'Apple',
      ...Array.from({ length: 500 }, (_, at) => `Fig ${at}`),
      'Zucchini',
    ])
    await press(host, 'z')
    expect(host.value).toBe('Zucchini')
    expect(rows(host).some((row) => row.value === 'Zucchini' && row.active)).toBe(true)
  })

  test('a filter narrows the whole set, and the place each says is in what is left', async () => {
    const host = await long()
    host.requestFilter('99')
    await settle(host)
    await settle(host)
    const drawn = rows(host)
    expect(drawn.map((row) => row.value).slice(0, 3)).toEqual(['Item 99', 'Item 199', 'Item 299'])
    expect(drawn[0]?.getAttribute('aria-setsize')).toBe('19')
  })

  test('a press on a drawn option chooses it, and the form sends its value', async () => {
    const host = await long('multiple')
    const third = rows(host)[2] as Row & { select(): void }
    third.select()
    await settle(host)
    expect(host.value).toBe('Item 2')
    expect((formValue(host) as FormData).getAll('c')).toEqual(['Item 2'])
    expect(rows(host)[2]?.selected).toBe(true)
  })

  test('takes records, with words and disabled options the keyboard passes over', async () => {
    const host = await long('', [
      { label: 'Alpha', value: 'a' },
      { disabled: true, label: 'Beta', value: 'b' },
      { label: 'Gamma', value: 3 },
    ])
    expect(rows(host).map((row) => [row.textContent, row.value, row.disabled])).toEqual([
      ['Alpha', 'a', false],
      ['Beta', 'b', true],
      ['Gamma', '3', false],
    ])
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(host.value).toBe('3')
  })

  test('leaves the children it was given unread', async () => {
    document.body.innerHTML = `<helix-headless-listbox label="L">
      <helix-headless-option value="child">Child</helix-headless-option>
    </helix-headless-listbox>`
    const host = document.body.firstElementChild as Listbox
    host.items = ['Data']
    await settle(host)
    await settle(host)
    expect(rows(host).map((row) => row.value)).toEqual(['Data'])
    await press(host, 'ArrowDown')
    expect(host.value).toBe('Data')
  })

  test('holds every drawn option down while the list is disabled', async () => {
    const host = await long('disabled', ['a', 'b'])
    expect(rows(host).map((row) => row.disabled)).toEqual([true, true])
  })

  test('says it is empty when handed none', async () => {
    const host = await long('', [])
    expect(rows(host)).toEqual([])
    expect(part(host as HTMLElement, 'empty')).not.toBeNull()
  })
})

/* Only in a real engine, which lays the rows out and scrolls them. */
if (hasLayout()) {
  describe('a list of data in a browser', () => {
    test('a list that grows keeps its reader where they were', async () => {
      /* Measured before this: a scroll offset of 5000 became 2813 when the
         page handed over a longer array, the row height put back at its
         estimate. */
      const host = await long()
      const items = part(host as HTMLElement, 'items') as HTMLElement
      items.scrollTop = 3000
      await new Promise((done) => setTimeout(done, 100))
      await settle(host)
      host.items = [...(host.items ?? []), ...Array.from({ length: 500 }, (_, at) => `More ${at}`)]
      await settle(host)
      await new Promise((done) => setTimeout(done, 100))
      expect(items.scrollTop).toBe(3000)
    })
  })
}
