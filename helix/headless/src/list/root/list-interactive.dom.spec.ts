import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasState,
  internalsOf,
  mount,
  part,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'

/* A list with `selection-mode`: a grid of rows a reader moves through, selects
   from and acts on. The default list is `list-root.dom.spec.ts`'s. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

interface List extends Updatable {
  rows: Row[]
  selectionMode: string | undefined
  value: string
}

interface Row extends Updatable {
  internals?: ElementInternals
}

const settle = async (list: List): Promise<void> => {
  await list.updateComplete
  await Promise.all(list.rows.map((row) => row.updateComplete))
  await list.updateComplete
  await Promise.all(list.rows.map((row) => row.updateComplete))
}

const grid = async (mode = 'single', extra = ''): Promise<List> => {
  const list = (await mount(`<helix-headless-list label="Files" selection-mode="${mode}" ${extra}>
    <helix-headless-list-item value="a">Alpha<button slot="end">Edit</button><button slot="end">Delete</button></helix-headless-list-item>
    <helix-headless-list-item value="b" disabled>Beta</helix-headless-list-item>
    <helix-headless-list-item value="c">Gamma</helix-headless-list-item>
  </helix-headless-list>`)) as List
  await settle(list)
  return list
}

const cell = (row: Row): HTMLElement => part(row, 'row') as HTMLElement

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  target.dispatchEvent(event)
  return event
}

/* happy-dom throws reading a shadow root's `activeElement` while nothing in
   it has focus, so each row is asked in turn. */
const focused = (list: List): Element | null => {
  for (const row of list.rows) {
    try {
      const inner = row.shadowRoot?.activeElement
      if (inner) {
        return inner
      }
    } catch {
      /* Nothing focused in this row. */
    }
  }
  return document.activeElement
}

describe('the grid', () => {
  test('is a grid of rows, each with one cell, and the default list is untouched', async () => {
    const list = await grid()
    expect(role(list)).toBe('grid')
    expect(list.rows.map((row) => role(row))).toEqual(['row', 'row', 'row'])
    expect(cell(list.rows[0] as Row).getAttribute('role')).toBe('gridcell')
  })

  test('is one tab stop, on the first row a key can reach', async () => {
    const list = await grid()
    expect(list.rows.map((row) => cell(row).getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  test('takes the stop on the selected row', async () => {
    const list = await grid('single', 'value="c"')
    expect(cell(list.rows[2] as Row).getAttribute('tabindex')).toBe('0')
  })

  test('says it selects several only where it does', async () => {
    const list = await grid('multiple')
    expect(internalsOf(list).ariaMultiSelectable).toBe('true')
  })
})

describe('the keys', () => {
  test('Down moves to the next row a key can reach, past a disabled one', async () => {
    const list = await grid()
    const [first, , third] = list.rows as [Row, Row, Row]
    cell(first).focus()
    expect(press(cell(first), 'ArrowDown').defaultPrevented).toBe(true)
    expect(focused(list)).toBe(cell(third))
  })

  /* Removing the focused row dropped focus to the body, and the arrow keys
     did nothing until the reader tabbed back in. React Aria's GridList moves
     focus to a neighbor. */
  test('removing the focused row moves focus to the next row a key can reach', async () => {
    const list = await grid('multiple')
    const [first, , third] = list.rows as [Row, Row, Row]
    cell(first).focus()
    first.remove()
    await new Promise((done) => setTimeout(done, 0))
    await settle(list)
    expect(focused(list)).toBe(cell(third))
  })

  test('or to the one before it, where the removed row was the last', async () => {
    const list = await grid('multiple')
    const [first, , third] = list.rows as [Row, Row, Row]
    cell(third).focus()
    third.remove()
    await new Promise((done) => setTimeout(done, 0))
    await settle(list)
    expect(focused(list)).toBe(cell(first))
  })

  /* A sheet outside could not tell which row showed keyboard focus without
     reaching into the row's part. */
  test('the row says its cell shows keyboard focus with a state', async () => {
    const list = await grid()
    const [first, , third] = list.rows as [Row, Row, Row]
    cell(first).focus()
    expect(hasState(first, 'focus-visible')).toBe(cell(first).matches(':focus-visible'))
    press(cell(first), 'ArrowDown')
    expect(hasState(first, 'focus-visible')).toBe(false)
    expect(hasState(third, 'focus-visible')).toBe(cell(third).matches(':focus-visible'))
  })

  /* React Aria's GridList takes `disabledBehavior`, and a disabled row here
     was always out of reach of the keys and of actions. */
  test('under disabled-behavior="selection" a disabled row is reached and acted on, and never selected', async () => {
    const list = await grid('multiple', 'disabled-behavior="selection"')
    const [first, second] = list.rows as [Row, Row, Row]
    expect(internalsOf(second)?.ariaDisabled ?? null).toBeNull()
    cell(first).focus()
    press(cell(first), 'ArrowDown')
    expect(focused(list)).toBe(cell(second))
    let acted = 0
    second.addEventListener('helix-action', () => {
      acted += 1
    })
    press(cell(second), 'Enter')
    press(cell(second), ' ')
    cell(second).click()
    await settle(list)
    expect(acted).toBe(2)
    expect(list.value).toBe('')
    const all = new KeyboardEvent('keydown', {
      bubbles: true,
      composed: true,
      ctrlKey: true,
      key: 'a',
    })
    cell(second).dispatchEvent(all)
    await settle(list)
    expect(list.value).toBe('a,c')
  })

  test('Right goes to each control in the row and back to the row', async () => {
    const list = await grid()
    const first = list.rows[0] as Row
    const [edit, remove] = [...first.querySelectorAll('button')]
    cell(first).focus()
    press(cell(first), 'ArrowRight')
    expect(document.activeElement).toBe(edit as Element)
    press(edit as Element, 'ArrowRight')
    expect(document.activeElement).toBe(remove as Element)
    press(remove as Element, 'ArrowRight')
    expect(focused(list)).toBe(cell(first))
  })

  test('Space selects the row and Enter acts on it', async () => {
    const list = await grid()
    const first = list.rows[0] as Row
    const acted: Element[] = []
    list.addEventListener('helix-action', (event) => acted.push(event.target as Element))
    press(cell(first), ' ')
    await settle(list)
    expect(list.value).toBe('a')
    expect(internalsOf(first)?.ariaSelected).toBe('true')
    expect(hasState(first, 'selected')).toBe(true)
    press(cell(first), 'Enter')
    expect(acted.length).toBe(1)
    expect(acted[0]).toBe(first)
  })

  test('Space on a control in the row is the control’s', async () => {
    const list = await grid()
    const edit = (list.rows[0] as Row).querySelector('button') as HTMLButtonElement
    expect(press(edit, ' ').defaultPrevented).toBe(false)
    expect(list.value).toBe('')
  })
})

describe('selection', () => {
  test('a press selects, asking first, and a refusal keeps the selection', async () => {
    const list = await grid('multiple')
    const seen: string[] = []
    list.addEventListener('helix-before-change', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    let changes = 0
    list.addEventListener('change', () => {
      changes += 1
    })
    cell(list.rows[0] as Row).click()
    cell(list.rows[2] as Row).click()
    await settle(list)
    expect(seen).toEqual(['a', 'a,c'])
    expect(list.value).toBe('a,c')
    expect(changes).toBe(2)

    list.addEventListener('helix-before-change', (event) => event.preventDefault())
    cell(list.rows[0] as Row).click()
    expect(list.value).toBe('a,c')
  })

  test('a press on a control in the row does not select it', async () => {
    const list = await grid()
    ;((list.rows[0] as Row).querySelector('button') as HTMLButtonElement).click()
    expect(list.value).toBe('')
  })

  test('a disabled row is announced as disabled and cannot be selected', async () => {
    const list = await grid()
    const beta = list.rows[1] as Row
    expect(internalsOf(beta)?.ariaDisabled).toBe('true')
    cell(beta).click()
    expect(list.value).toBe('')
  })

  test('a list that selects nothing acts on a press, and says nothing about selection', async () => {
    const list = await grid('none')
    expect(list.rows.map((row) => internalsOf(row)?.ariaSelected ?? null)).toEqual([
      null,
      null,
      null,
    ])
    let acted = 0
    list.addEventListener('helix-action', () => {
      acted += 1
    })
    cell(list.rows[0] as Row).click()
    expect(acted).toBe(1)
    expect(list.value).toBe('')
  })

  test('turning selection off makes it a plain list again', async () => {
    const list = await grid()
    list.selectionMode = undefined
    await settle(list)
    expect(role(list)).toBe('list')
    expect(role(list.rows[0] as Row)).toBe('listitem')
    expect(cell(list.rows[0] as Row).hasAttribute('tabindex')).toBe(false)
  })
})

describe('a reversed list', () => {
  test('counts down from the number of rows once it knows them', async () => {
    const list = (await mount(`<helix-headless-list kind="ordered" reversed>
      <helix-headless-list-item>One</helix-headless-list-item>
      <helix-headless-list-item>Two</helix-headless-list-item>
      <helix-headless-list-item>Three</helix-headless-list-item>
    </helix-headless-list>`)) as List
    await list.updateComplete
    const slot = list.shadowRoot?.querySelector('slot') as HTMLSlotElement
    expect(slot.getAttribute('style')).toBe('--list-first: 3; --list-step: -1')
  })

  test('counts its rows and not the content of its empty or loading slots', async () => {
    const list = (await mount(`<helix-headless-list kind="ordered" reversed loading>
      <helix-headless-list-item>One</helix-headless-list-item>
      <helix-headless-list-item>Two</helix-headless-list-item>
      <p slot="loading">Fetching</p>
      <p slot="empty">None yet</p>
    </helix-headless-list>`)) as List
    await list.updateComplete
    const slot = list.shadowRoot?.querySelector('slot') as HTMLSlotElement
    expect(slot.getAttribute('style')).toBe('--list-first: 2; --list-step: -1')
  })
})

describe('ranges and replacing', () => {
  const rows5 = async (extra = ''): Promise<List> => {
    const list =
      (await mount(`<helix-headless-list label="Files" selection-mode="multiple" ${extra}>
      <helix-headless-list-item value="a">Alpha</helix-headless-list-item>
      <helix-headless-list-item value="b">Beta</helix-headless-list-item>
      <helix-headless-list-item value="c" disabled>Gamma</helix-headless-list-item>
      <helix-headless-list-item value="d">Delta</helix-headless-list-item>
      <helix-headless-list-item value="e">Epsilon</helix-headless-list-item>
    </helix-headless-list>`)) as List
    await settle(list)
    return list
  }

  const key = (target: Element, name: string, init: KeyboardEventInit = {}): void => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: name,
        ...init,
      }),
    )
  }

  const click = (target: Element, init: MouseEventInit = {}): void => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ...init }))
  }

  test('Shift with Down takes in each row it reaches, past a disabled one', async () => {
    const list = await rows5()
    const [a] = list.rows as [Row]
    cell(a).focus()
    key(cell(a), 'ArrowDown', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b')
    key(focused(list) as Element, 'ArrowDown', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,d')
  })

  test('Shift with Up back toward the anchor lets go of the rows the range passed, and keeps the rest', async () => {
    const list = await rows5()
    const [a, , , , e] = list.rows as [Row, Row, Row, Row, Row]
    click(cell(e))
    click(cell(a))
    await settle(list)
    cell(a).focus()
    key(cell(a), 'ArrowDown', { shiftKey: true })
    await settle(list)
    key(focused(list) as Element, 'ArrowDown', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,d,e')
    key(focused(list) as Element, 'ArrowUp', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,e')
    key(focused(list) as Element, 'ArrowUp', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,e')
  })

  test('Shift with a press or Space takes in the rows from the last one pressed', async () => {
    const list = await rows5()
    const [a, , , d, e] = list.rows as [Row, Row, Row, Row, Row]
    click(cell(a))
    await settle(list)
    click(cell(e), { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,d,e')
    click(cell(d))
    await settle(list)
    expect(list.value).toBe('a,b,e')
    key(cell(a), ' ', { shiftKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,d,e')
  })

  test('writes its value in row order, whatever order the rows were chosen in, as Data Table does', async () => {
    const list = await rows5()
    const [a, , , d] = list.rows as [Row, Row, Row, Row]
    const asked: string[] = []
    list.addEventListener('helix-before-change', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    click(cell(d))
    click(cell(a))
    await settle(list)
    expect(asked).toEqual(['d', 'a,d'])
    expect(list.value).toBe('a,d')
  })

  test('Control or Command with A selects every row a key can reach', async () => {
    const list = await rows5()
    const changes: string[] = []
    list.addEventListener('helix-before-change', (event) =>
      changes.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    key(cell(list.rows[0] as Row), 'a', { ctrlKey: true })
    await settle(list)
    expect(list.value).toBe('a,b,d,e')
    key(cell(list.rows[0] as Row), 'A', { metaKey: true })
    // Everything is already selected, so nothing is asked.
    expect(changes).toEqual(['a,b,d,e'])
  })

  test('Page Down and Page Up move a box of rows, and Shift takes them in', async () => {
    const list = await rows5()
    const [a, , , , e] = list.rows as [Row, Row, Row, Row, Row]
    cell(a).focus()
    // happy-dom lays nothing out, so every row fits in the box.
    key(cell(a), 'PageDown', { shiftKey: true })
    await settle(list)
    expect(focused(list)).toBe(cell(e))
    expect(list.value).toBe('a,b,d,e')
    key(cell(e), 'PageUp')
    await settle(list)
    expect(focused(list)).toBe(cell(a))
    expect(list.value).toBe('a,b,d,e')
  })

  test('Page Down under replace selects the row it lands on', async () => {
    const list = await rows5('selection-behavior="replace"')
    const [a, , , , e] = list.rows as [Row, Row, Row, Row, Row]
    cell(a).focus()
    key(cell(a), 'PageDown')
    await settle(list)
    expect(focused(list)).toBe(cell(e))
    expect(list.value).toBe('e')
  })

  test('Escape lets go of the selection, asking first, and only then keeps the key', async () => {
    const list = await rows5('value="a,d"')
    const outside: string[] = []
    const listen = (event: KeyboardEvent): void => {
      outside.push(event.key)
    }
    document.body.addEventListener('keydown', listen)
    const refuse = (event: Event): void => event.preventDefault()
    list.addEventListener('helix-before-change', refuse)
    const first = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Escape',
    })
    cell(list.rows[0] as Row).dispatchEvent(first)
    await settle(list)
    expect(list.value).toBe('a,d')
    list.removeEventListener('helix-before-change', refuse)
    key(cell(list.rows[0] as Row), 'Escape')
    await settle(list)
    expect(list.value).toBe('')
    expect(outside).toEqual([])
    key(cell(list.rows[0] as Row), 'Escape')
    document.body.removeEventListener('keydown', listen)
    expect(outside).toEqual(['Escape'])
  })

  test('replace selects a pressed row alone, and the keys carry the selection', async () => {
    const list = await rows5('selection-behavior="replace"')
    const [a, b, , d] = list.rows as [Row, Row, Row, Row]
    click(cell(a))
    await settle(list)
    click(cell(b))
    await settle(list)
    expect(list.value).toBe('b')
    cell(b).focus()
    key(cell(b), 'ArrowDown')
    await settle(list)
    expect(focused(list)).toBe(cell(d))
    expect(list.value).toBe('d')
    key(cell(d), 'ArrowUp', { ctrlKey: true })
    await settle(list)
    expect(focused(list)).toBe(cell(b))
    expect(list.value).toBe('d')
    click(cell(a), { metaKey: true })
    await settle(list)
    expect(list.value).toBe('a,d')
  })

  test('a row is named by its label and described by its description, not its controls', async () => {
    const list = (await mount(`<helix-headless-list label="Files" selection-mode="single">
      <helix-headless-list-item value="q">Quarterly report<span slot="description">Edited today</span><button slot="end">Share</button></helix-headless-list-item>
      <helix-headless-list-item value="r"><span slot="start">Only a start</span></helix-headless-list-item>
    </helix-headless-list>`)) as List
    await settle(list)
    const [named, bare] = list.rows as [Row, Row]
    const label = cell(named).getAttribute('aria-labelledby')
    expect(label).toBe('label')
    expect(named.shadowRoot?.getElementById(label as string)?.tagName).toBe('SLOT')
    expect(cell(named).getAttribute('aria-describedby')).toBe('description')
    // A row with no label words is named by its content.
    expect(cell(bare).hasAttribute('aria-labelledby')).toBe(false)
    expect(cell(bare).hasAttribute('aria-describedby')).toBe(false)
  })
})
