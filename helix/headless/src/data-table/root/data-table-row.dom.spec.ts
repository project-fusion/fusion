import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * What a consumer needs from a row and a cell: the matched count, a press handed
 * to a router, a whole row that works its link, and a row that names itself.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

/* A link needs a page to be on the same origin as. A browser is on one, and
   happy-dom starts on `about:blank`. */
const setURL = (url: string): void => {
  ;(globalThis as { happyDOM?: { setURL(to: string): void } }).happyDOM?.setURL(url)
}

beforeEach(() => {
  setURL('https://console.example/prospects')
})

afterEach(() => {
  setURL('about:blank')
})

interface Table extends Updatable {
  cellStyles: CSSStyleSheet[]
  filter: string
  readonly matched: number
  rowLink: boolean
  rowParts: (row: Record<string, unknown>, index: number) => string
  rows: readonly Record<string, unknown>[]
  total: number
}

type Column = HTMLElement & { cell: (row: Record<string, unknown>) => unknown }

const table = async (attrs = ''): Promise<Table> => {
  const element = (await mount(`<helix-headless-data-table row-key="id" ${attrs}>
    <helix-headless-table-column field="name">Name</helix-headless-table-column>
    <helix-headless-table-column field="size">Size</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = [
    { id: 'a', name: 'alpha', size: 30 },
    { id: 'b', name: 'bravo', size: 4 },
    { id: 'c', name: 'charlie', size: 1000 },
  ]
  await settle(element)
  return element
}

/** A table whose first column draws a real anchor, as a Lit template would. */
const linked = async (attrs = '', href = '/prospects/a'): Promise<Table> => {
  const element = await table(attrs)
  const column = element.querySelector('helix-headless-table-column') as Column
  column.cell = (row) => {
    const anchor = document.createElement('a')
    anchor.href = new URL(href, location.href).href
    anchor.textContent = String(row.name)
    return anchor
  }
  element.rows = [...element.rows]
  await settle(element)
  return element
}

const anchorIn = (element: Table): HTMLAnchorElement =>
  element.shadowRoot?.querySelector('a') as HTMLAnchorElement

/**
 * Presses, says whether the table refused the press, and stops it at the window
 * either way, so a press nobody refused does not take the page with it.
 */
const press = (target: Element, init: MouseEventInit = {}): { defaultPrevented: boolean } => {
  let refused = false
  const stop = (event: Event): void => {
    refused ||= event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', stop)
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...init }),
  )
  window.removeEventListener('click', stop)
  return { defaultPrevented: refused }
}

describe('matched', () => {
  test('is public, and counts the rows the filter leaves across every page', async () => {
    const element = await table('page-size="1"')
    expect(element.matched).toBe(3)
    element.filter = 'bravo'
    await settle(element)
    expect(element.matched).toBe(1)
  })

  test('is the total on a table the server pages', async () => {
    const element = await table('mode="server" page-size="3"')
    element.total = 40
    await settle(element)
    expect(element.matched).toBe(40)
  })
})

describe('helix-before-follow', () => {
  test('hands a plain press on a link to the page, which keeps the page by refusing', async () => {
    const element = await linked()
    const asked: string[] = []
    element.addEventListener('helix-before-follow', (event) => {
      asked.push((event as CustomEvent<{ href: string }>).detail.href)
      event.preventDefault()
    })
    const click = press(anchorIn(element))
    expect(asked).toEqual(['/prospects/a'])
    expect(click.defaultPrevented).toBe(true)
  })

  test('leaves the press to the browser where nobody refuses, and says so', async () => {
    const element = await linked()
    const followed: string[] = []
    element.addEventListener('helix-follow', (event) => {
      followed.push((event as CustomEvent<{ href: string }>).detail.href)
    })
    expect(press(anchorIn(element)).defaultPrevented).toBe(false)
    expect(followed).toEqual(['/prospects/a'])
  })

  for (const [name, init] of [
    ['Control', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['a middle press', { button: 1 }],
  ] as const) {
    test(`says nothing for ${name}, which asks for something else`, async () => {
      const element = await linked()
      let asked = 0
      element.addEventListener('helix-before-follow', () => {
        asked += 1
      })
      press(anchorIn(element), init)
      expect(asked).toBe(0)
    })
  }

  test('says nothing for a download, a new tab, or another origin', async () => {
    const element = await linked()
    let asked = 0
    element.addEventListener('helix-before-follow', () => {
      asked += 1
    })
    const anchor = anchorIn(element)
    anchor.setAttribute('download', '')
    press(anchor)
    anchor.removeAttribute('download')
    anchor.target = '_blank'
    press(anchor)
    anchor.removeAttribute('target')
    anchor.href = 'https://example.com/elsewhere'
    press(anchor)
    expect(asked).toBe(0)
  })
})

describe('row-link', () => {
  const cellOf = (element: Table, row = 0, column = 1): HTMLElement =>
    element.shadowRoot?.querySelectorAll(`[data-row="${row}"] [part~="cell"]`)[
      column
    ] as HTMLElement

  test('a press elsewhere on the row works the row’s link', async () => {
    const element = await linked('row-link')
    const asked: string[] = []
    element.addEventListener('helix-before-follow', (event) => {
      asked.push((event as CustomEvent<{ href: string }>).detail.href)
      event.preventDefault()
    })
    press(cellOf(element))
    expect(asked).toEqual(['/prospects/a'])
  })

  test('off, a press on the row does nothing', async () => {
    const element = await linked()
    let asked = 0
    element.addEventListener('helix-before-follow', () => {
      asked += 1
    })
    press(cellOf(element))
    expect(asked).toBe(0)
  })

  test('the link pressed directly is worked once', async () => {
    const element = await linked('row-link')
    let asked = 0
    element.addEventListener('helix-before-follow', (event) => {
      asked += 1
      event.preventDefault()
    })
    press(anchorIn(element))
    expect(asked).toBe(1)
  })

  test('a held modifier goes with the press', async () => {
    const element = await linked('row-link')
    const held: boolean[] = []
    anchorIn(element).addEventListener('click', (event) => {
      held.push(event.ctrlKey)
      event.preventDefault()
    })
    press(cellOf(element), { ctrlKey: true })
    expect(held).toEqual([true])
  })
})

describe('rowParts', () => {
  test('adds names to the row’s part, beside its own', async () => {
    const element = await table()
    element.rowParts = (row) => (row.size === 4 ? 'blocked' : '')
    await settle(element)
    const rows = [...(element.shadowRoot?.querySelectorAll('[part~="row"]') ?? [])]
    expect(rows.map((row) => row.getAttribute('part'))).toEqual([
      'row',
      'row blocked',
      'row row-last',
    ])
  })
})

describe('cellStyles', () => {
  test('adds the sheets to the shadow root, and a new list replaces only its own', async () => {
    const element = await table()
    const root = element.shadowRoot as ShadowRoot
    const before = root.adoptedStyleSheets.length
    const one = new CSSStyleSheet()
    const two = new CSSStyleSheet()
    element.cellStyles = [one]
    await settle(element)
    expect(root.adoptedStyleSheets.length).toBe(before + 1)
    expect(root.adoptedStyleSheets.at(-1)).toBe(one)
    element.cellStyles = [two]
    await settle(element)
    expect(root.adoptedStyleSheets.length).toBe(before + 1)
    expect(root.adoptedStyleSheets.at(-1)).toBe(two)
  })
})
