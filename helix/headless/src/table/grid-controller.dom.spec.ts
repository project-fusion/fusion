import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('./index.js')
})

type Updating = HTMLElement & { updateComplete: Promise<boolean> }

/* An update, and then the observer's turn: a mutation record is delivered
   as a microtask after the change, and the render it asks for after that. */
const settle = async (host: Updating): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await host.updateComplete
}

/**
 * A table read as a grid: one tab stop, and the arrow keys between its cells,
 * as React Aria's table is.
 */
describe('a grid table', () => {
  type Gridded = Updating & { grid: boolean; selected: string; sort: string }

  const gridded = (attributes = 'grid'): string => `
    <helix-headless-table label="Services" ${attributes}>
      <helix-headless-table-column field="name" sortable>Service</helix-headless-table-column>
      <helix-headless-table-column>Region</helix-headless-table-column>
      <helix-headless-table-row value="web" href="#web">
        <helix-headless-table-cell header>web</helix-headless-table-cell>
        <helix-headless-table-cell><button>Logs</button> <button>Retry</button></helix-headless-table-cell>
      </helix-headless-table-row>
      <helix-headless-table-row value="api">
        <helix-headless-table-cell header>api</helix-headless-table-cell>
        <helix-headless-table-cell>us</helix-headless-table-cell>
      </helix-headless-table-row>
    </helix-headless-table>`

  const table = async (attributes?: string): Promise<Gridded> => {
    const host = (await mount(gridded(attributes))) as Gridded
    await settle(host)
    await settle(host)
    return host
  }

  const cells = (host: HTMLElement): HTMLElement[] => [
    ...host.querySelectorAll<HTMLElement>('helix-headless-table-cell'),
  ]
  const heading = (host: HTMLElement, at: number): HTMLElement =>
    (
      host.querySelectorAll('helix-headless-table-column')[at] as HTMLElement
    ).shadowRoot?.querySelector('[part="column"]') as HTMLElement
  const focused = (host: HTMLElement): Element | null => {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement
    }
    return active ?? host
  }
  const press = async (
    host: Gridded,
    key: string,
    init: KeyboardEventInit = {},
  ): Promise<boolean> => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      ...init,
    })
    ;(focused(host) as HTMLElement).dispatchEvent(event)
    await settle(host)
    return event.defaultPrevented
  }

  test('is a static table without `grid`, and writes nothing onto the cells', async () => {
    const host = await table('')
    expect(part(host, 'table')?.getAttribute('role')).toBe('table')
    expect(cells(host).map((cell) => cell.hasAttribute('tabindex'))).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(role(cells(host)[1] as HTMLElement)).toBe('cell')
  })

  test('is a grid of one tab stop, on the first heading, and every value a gridcell', async () => {
    const host = await table()
    expect(part(host, 'table')?.getAttribute('role')).toBe('grid')
    expect(heading(host, 0).getAttribute('tabindex')).toBe('0')
    expect(heading(host, 1).getAttribute('tabindex')).toBe('-1')
    expect(cells(host).map((cell) => cell.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '-1',
      '-1',
    ])
    expect(role(cells(host)[1] as HTMLElement)).toBe('gridcell')
    expect(role(cells(host)[0] as HTMLElement)).toBe('rowheader')
  })

  test('moves the stop and focus with the arrows, Home, End and Control with them', async () => {
    const host = await table()
    heading(host, 0).focus()
    expect(await press(host, 'ArrowDown')).toBe(true)
    expect(focused(host)).toBe(cells(host)[0] as HTMLElement)
    expect(cells(host)[0]?.getAttribute('tabindex')).toBe('0')
    expect(heading(host, 0).getAttribute('tabindex')).toBe('-1')
    await press(host, 'ArrowRight')
    expect(focused(host)).toBe(cells(host)[1] as HTMLElement)
    await press(host, 'Home')
    expect(focused(host)).toBe(cells(host)[0] as HTMLElement)
    await press(host, 'End', { ctrlKey: true })
    expect(focused(host)).toBe(cells(host)[3] as HTMLElement)
    await press(host, 'Home', { ctrlKey: true })
    expect(focused(host)).toBe(heading(host, 0))
    expect(await press(host, 'ArrowUp')).toBe(true)
    expect(focused(host)).toBe(heading(host, 0))
  })

  test('sorts from a sortable heading with Enter', async () => {
    const host = await table()
    heading(host, 0).focus()
    await press(host, 'Enter')
    expect(host.sort).toBe('name:asc')
  })

  /* A followed link is a click on an anchor the table adds for the moment,
     heard here and stopped, so nothing navigates. */
  const followed: string[] = []
  const hear = (event: Event): void => {
    const anchor = event.target
    if (anchor instanceof HTMLAnchorElement && anchor.hidden) {
      followed.push(anchor.getAttribute('href') ?? '')
      event.preventDefault()
    }
  }
  afterEach(() => {
    document.removeEventListener('click', hear, true)
    followed.length = 0
  })

  test('follows the row link with Enter on any cell of the row', async () => {
    document.addEventListener('click', hear, true)
    const host = await table()
    cells(host)[0]?.focus()
    await press(host, 'Enter')
    expect(followed).toEqual(['#web'])
  })

  test('moves into a cell with F2, between its controls with Tab, and back with Escape', async () => {
    const host = await table()
    cells(host)[1]?.focus()
    await press(host, 'F2')
    expect(focused(host)?.textContent).toBe('Logs')
    expect(await press(host, 'Tab')).toBe(true)
    expect(focused(host)?.textContent).toBe('Retry')
    await press(host, 'Escape')
    expect(focused(host)).toBe(cells(host)[1] as HTMLElement)
  })

  test('leaves by the box at its end on Tab, and by the one at its start on Shift and Tab', async () => {
    const host = await table()
    cells(host)[1]?.focus()
    expect(await press(host, 'Tab')).toBe(false)
    expect(focused(host)).toBe(part(host, 'grid-end'))
    cells(host)[1]?.focus()
    await press(host, 'Tab', { shiftKey: true })
    expect(focused(host)).toBe(part(host, 'grid-start'))
  })

  test('hands focus arriving from outside to the stop', async () => {
    const host = await table()
    const outside = document.createElement('button')
    document.body.prepend(outside)
    outside.focus()
    host.querySelector('button')?.focus()
    await settle(host)
    expect(focused(host)).toBe(heading(host, 0))
    outside.remove()
  })

  test('selects a row with Space and every row with Control and A, where it is selectable', async () => {
    const host = await table('grid selectable')
    expect(part(host, 'table')?.getAttribute('aria-multiselectable')).toBe('true')
    cells(host)[0]?.focus()
    await press(host, ' ')
    expect(host.selected).toBe('web')
    await press(host, 'a', { ctrlKey: true })
    expect(host.selected).toBe('web,api')
  })

  /* Typeahead and Shift ranges were Data Table's alone, which React Aria's
     table has as well. */
  const three = `
    <helix-headless-table label="Services" grid selectable>
      <helix-headless-table-column>Service</helix-headless-table-column>
      <helix-headless-table-row value="web"><helix-headless-table-cell header>web</helix-headless-table-cell></helix-headless-table-row>
      <helix-headless-table-row value="api"><helix-headless-table-cell header>api</helix-headless-table-cell></helix-headless-table-row>
      <helix-headless-table-row value="queue"><helix-headless-table-cell header>queue</helix-headless-table-cell></helix-headless-table-row>
    </helix-headless-table>`

  test('moves to the row whose first cell starts with the letters typed', async () => {
    const host = (await mount(three)) as Gridded
    await settle(host)
    await settle(host)
    cells(host)[0]?.focus()
    expect(await press(host, 'q')).toBe(true)
    expect(focused(host)).toBe(cells(host)[2] as Element)
    expect(await press(host, 'z')).toBe(false)
    expect(focused(host)).toBe(cells(host)[2] as Element)
    expect(host.selected).toBe('')
  })

  test('selects the rows Shift with Down crosses, and Shift with Space a range', async () => {
    const host = (await mount(three)) as Gridded
    await settle(host)
    await settle(host)
    cells(host)[0]?.focus()
    await press(host, 'ArrowDown', { shiftKey: true })
    expect(host.selected).toBe('web,api')
    expect(focused(host)).toBe(cells(host)[1] as Element)

    host.selected = ''
    await settle(host)
    await press(host, ' ')
    expect(host.selected).toBe('api')
    await press(host, 'ArrowDown')
    await press(host, ' ', { shiftKey: true })
    expect(host.selected).toBe('api,queue')
  })

  test('under selection-behavior replace, the arrows carry the selection and Control moves alone', async () => {
    const host = (await mount(
      three.replace('grid selectable', 'grid selectable selection-behavior="replace"'),
    )) as Gridded
    await settle(host)
    await settle(host)
    cells(host)[0]?.focus()
    await press(host, 'ArrowDown')
    expect(host.selected).toBe('api')
    await press(host, 'ArrowDown', { ctrlKey: true })
    expect(focused(host)).toBe(cells(host)[2] as Element)
    expect(host.selected).toBe('api')
    await press(host, ' ', { ctrlKey: true })
    expect(host.selected).toBe('api,queue')
    await press(host, ' ')
    expect(host.selected).toBe('queue')
  })

  test('under selection-mode single, Shift takes in nothing more and Control with A nothing', async () => {
    const host = (await mount(
      three.replace('grid selectable', 'grid selectable selection-mode="single"'),
    )) as Gridded
    await settle(host)
    await settle(host)
    expect(part(host, 'table')?.getAttribute('aria-multiselectable')).toBe('false')
    cells(host)[0]?.focus()
    await press(host, ' ')
    await press(host, 'ArrowDown', { shiftKey: true })
    expect(host.selected).toBe('api')
    expect(await press(host, 'a', { ctrlKey: true })).toBe(false)
    expect(host.selected).toBe('api')
  })

  /* A row a reader may see and not choose, as React Aria's `disabledKeys`. */
  test('passes over a disabled row when selecting, and keeps its link shut', async () => {
    const host = (await mount(
      three.replace(
        '<helix-headless-table-row value="api">',
        '<helix-headless-table-row value="api" disabled href="#api">',
      ),
    )) as Gridded
    await settle(host)
    await settle(host)
    const api = host.querySelector('[value="api"]') as HTMLElement
    const internals = (api as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaDisabled).toBe('true')
    expect((part(api, 'checkbox') as HTMLElement & { disabled: boolean }).disabled).toBe(true)

    cells(host)[0]?.focus()
    await press(host, 'a', { ctrlKey: true })
    expect(host.selected).toBe('web,queue')
    const all = part(host, 'checkbox') as HTMLElement & { checked: boolean }
    expect(all.checked).toBe(true)

    host.selected = ''
    await settle(host)
    await press(host, 'ArrowDown')
    expect(focused(host)).toBe(cells(host)[1] as Element)
    await press(host, ' ')
    expect(host.selected).toBe('')
    await press(host, 'ArrowUp')
    await press(host, ' ')
    await press(host, 'ArrowDown', { shiftKey: true })
    await press(host, 'ArrowDown', { shiftKey: true })
    expect(host.selected).toBe('web,queue')

    let followed = false
    host.ownerDocument.defaultView?.addEventListener('hashchange', () => {
      followed = true
    })
    api.click()
    await press(host, 'Enter')
    expect(followed).toBe(false)
    expect(location.hash).not.toBe('#api')
  })

  /* The stop and focus were on a row that went, so focus fell to the page and
     the stop to the first heading. React Aria moves both to a neighbor. */
  test('hands focus to the next row, at the same column, when the focused row goes', async () => {
    const host = await table()
    const [, , apiName] = cells(host)
    const web = host.querySelector('[value="web"]') as HTMLElement
    cells(host)[1]?.focus()
    await settle(host)
    web.remove()
    await settle(host)
    expect(focused(host)).toBe(cells(host)[1] as HTMLElement)
    expect(cells(host)[1]?.getAttribute('tabindex')).toBe('0')
    expect(apiName?.getAttribute('tabindex')).toBe('-1')
  })

  test('hands focus to the row before when the last row goes', async () => {
    const host = await table()
    cells(host)[2]?.focus()
    await settle(host)
    host.querySelector('[value="api"]')?.remove()
    await settle(host)
    expect(focused(host)).toBe(cells(host)[0] as HTMLElement)
  })

  test('moves the stop and leaves focus alone when the row goes while focus is elsewhere', async () => {
    const host = await table()
    const outside = document.createElement('button')
    document.body.append(outside)
    cells(host)[3]?.focus()
    await settle(host)
    outside.focus()
    await settle(host)
    host.querySelector('[value="api"]')?.remove()
    await settle(host)
    expect(document.activeElement).toBe(outside)
    expect(cells(host)[1]?.getAttribute('tabindex')).toBe('0')
    outside.remove()
  })

  test('takes the stops back when it stops being a grid', async () => {
    const host = await table()
    host.grid = false
    await settle(host)
    expect(cells(host).some((cell) => cell.hasAttribute('tabindex'))).toBe(false)
    expect(heading(host, 0).hasAttribute('tabindex')).toBe(false)
  })
})

/* Right and Left moved along a nested row and never opened or shut it, so a
   reader on the keyboard reached the rows under a folder only by Enter. */
describe('a grid table whose rows nest', () => {
  type Nesting = Updating & { expanded: string }

  const nested = (attributes = ''): string => `
    <helix-headless-table label="Files" grid ${attributes}>
      <helix-headless-table-column>Name</helix-headless-table-column>
      <helix-headless-table-row value="src"><helix-headless-table-cell>src</helix-headless-table-cell></helix-headless-table-row>
      <helix-headless-table-row value="a" parent="src"><helix-headless-table-cell>a.ts</helix-headless-table-cell></helix-headless-table-row>
      <helix-headless-table-row value="readme"><helix-headless-table-cell>README</helix-headless-table-cell></helix-headless-table-row>
    </helix-headless-table>`

  const table = async (attributes?: string): Promise<Nesting> => {
    const host = (await mount(nested(attributes))) as Nesting
    await settle(host)
    await settle(host)
    return host
  }

  const disclosure = (host: HTMLElement, value: string): HTMLElement =>
    host
      .querySelector(`[value="${value}"]`)
      ?.shadowRoot?.querySelector('[part~="expand"]') as HTMLElement

  const deepest = (): Element | null => {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement
    }
    return active
  }

  const press = async (host: Nesting, key: string): Promise<boolean> => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    ;(deepest() as HTMLElement).dispatchEvent(event)
    await settle(host)
    await settle(host)
    return event.defaultPrevented
  }

  test('opens a shut row with Right, moves on along an open one, and shuts it with Left', async () => {
    const host = await table()
    disclosure(host, 'src').focus()
    expect(await press(host, 'ArrowRight')).toBe(true)
    expect(host.expanded).toBe('src')
    expect(deepest()).toBe(disclosure(host, 'src'))
    await press(host, 'ArrowRight')
    expect(deepest()).toBe(host.querySelector('[value="src"] helix-headless-table-cell'))
    await press(host, 'ArrowLeft')
    expect(deepest()).toBe(disclosure(host, 'src'))
    expect(await press(host, 'ArrowLeft')).toBe(true)
    expect(host.expanded).toBe('')
  })

  test('moves from a row with none under it to the row it sits under with Left, as Data Table does', async () => {
    const host = await table('default-expanded="src"')
    disclosure(host, 'a').focus()
    expect(await press(host, 'ArrowLeft')).toBe(true)
    expect(deepest()).toBe(disclosure(host, 'src'))
    expect(host.expanded).toBe('src')
  })

  test('opens with Left on a right-to-left page', async () => {
    const host = await table('dir="rtl"')
    disclosure(host, 'src').focus()
    expect(await press(host, 'ArrowLeft')).toBe(true)
    expect(host.expanded).toBe('src')
  })
})
