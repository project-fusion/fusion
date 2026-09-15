import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* What arranging costs in paint and in boxes. Which rows are chosen and which
   order is asked for are the headless tier's claims and are asserted there; here
   is what only a browser can answer: that a heading's button takes focus, that a
   drag moves an edge by the distance dragged, and that a chosen row looks it.
   Run them with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

interface Table extends HTMLElement {
  order: string
  rows: readonly Record<string, unknown>[]
  selected: string
  updateComplete: Promise<unknown>
}

type Column = HTMLElement & { updateComplete: Promise<unknown>; width: string }

const table = async (attrs = ''): Promise<Table> => {
  const element = (await mount(`<helix-data-table label="Objects" row-key="id" ${attrs}>
    <helix-table-column field="name" resizable sortable width="10rem">Name</helix-table-column>
    <helix-table-column field="size" align="end" resizable>Size</helix-table-column>
    <helix-table-column field="kind">Kind</helix-table-column>
  </helix-data-table>`)) as Table
  element.rows = [
    { id: 'a', kind: 'image', name: 'alpha', size: 30 },
    { id: 'b', kind: 'font', name: 'bravo', size: 4 },
  ]
  await frames(element)
  return element
}

/* A resize observer reports on the frame after layout, so a width is read after
   two frames and the updates they cause, never straight after the change. */
const frames = async (element: { updateComplete: Promise<unknown> }): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await element.updateComplete
  }
}

const column = (element: Table, field: string): Column =>
  element.querySelector(`helix-table-column[field="${field}"]`) as Column
const inner = (host: HTMLElement, name: string): HTMLElement =>
  host.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement
const heading = (element: Table, field: string): DOMRect =>
  inner(column(element, field), 'column').getBoundingClientRect()

const pointer = (target: EventTarget, type: string, clientX: number, clientY: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX,
      clientY,
      composed: true,
      isPrimary: true,
      pointerId: 1,
    }),
  )
}

describe('a sortable heading', () => {
  geometry('is a button the keyboard reaches, and the column host is not', async () => {
    const element = await table()
    const name = column(element, 'name')
    const sort = inner(name, 'sort')
    sort.focus()
    expect(name.shadowRoot?.activeElement).toBe(sort)
    expect(sort.tabIndex).toBe(0)
    /* The styled column is `display: contents`, so it has no box to focus. The
       button is the only stop, and a heading without `sortable` has none. */
    expect(inner(column(element, 'size'), 'sort')).toBeNull()
  })
})

describe('a resizable column', () => {
  geometry('keeps its edge under the pointer while it is dragged', async () => {
    const element = await table()
    const name = column(element, 'name')
    const before = heading(element, 'name').width
    const edge = inner(name, 'resizer')
    const box = edge.getBoundingClientRect()
    const y = box.top + box.height / 2

    pointer(edge, 'pointerdown', box.left + 2, y)
    pointer(edge, 'pointermove', box.left + 42, y)
    pointer(edge, 'pointerup', box.left + 42, y)
    await frames(element)

    expect(name.width).toBe(`${Math.round(before) + 40}px`)
    expect(Math.abs(heading(element, 'name').width - (before + 40))).toBeLessThan(2)
  })

  geometry(
    'an arrow on its edge widens it a step, and Home takes it to the narrowest',
    async () => {
      const element = await table()
      const name = column(element, 'name')
      const before = Math.round(heading(element, 'name').width)
      const edge = inner(name, 'resizer')

      edge.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
      await frames(element)
      expect(name.width).toBe(`${before + 16}px`)
      expect(edge.getAttribute('aria-valuenow')).toBe(String(before + 16))

      edge.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }))
      await frames(element)
      expect(Math.round(heading(element, 'name').width)).toBe(48)
    },
  )

  geometry('draws its edge only where the heading ends', async () => {
    const element = await table()
    const edge = inner(column(element, 'name'), 'resizer').getBoundingClientRect()
    const box = heading(element, 'name')
    expect(Math.abs(edge.right - box.right)).toBeLessThan(2)
    expect(edge.width).toBeLessThan(box.width / 4)
  })

  geometry('on the last column, does not push the table past its own box', async () => {
    const element = (await mount(`<helix-data-table label="Objects" style="inline-size: 30rem">
      <helix-table-column field="name">Name</helix-table-column>
      <helix-table-column field="size" resizable>Size</helix-table-column>
    </helix-data-table>`)) as Table
    element.rows = [{ name: 'alpha', size: 30 }]
    await frames(element)
    const box = element.shadowRoot?.querySelector('[part="table"]') as HTMLElement
    expect(box.scrollWidth).toBe(box.clientWidth)
  })
})

describe('a grip', () => {
  geometry('dragged past the next heading asks for the columns in that order', async () => {
    const element = await table('reorderable')
    const asked: string[] = []
    element.addEventListener('helix-reorder', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const grip = inner(column(element, 'name'), 'grip')
    const from = grip.getBoundingClientRect()
    const past = heading(element, 'size')
    const y = from.top + from.height / 2

    pointer(grip, 'pointerdown', from.left + 2, y)
    pointer(window, 'pointermove', past.right - 4, y)
    await frames(element)
    /* Previewed while held: the headings already sit in the new order, and
       nobody has been asked yet. */
    expect(heading(element, 'size').left).toBeLessThan(heading(element, 'name').left)
    expect(asked).toEqual([])

    pointer(window, 'pointerup', past.right - 4, y)
    await frames(element)
    expect(asked).toEqual(['size name kind'])
    expect(element.order).toBe('size name kind')
  })

  geometry('let go where it started asks for nothing', async () => {
    const element = await table('reorderable')
    const asked: string[] = []
    element.addEventListener('helix-reorder', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const grip = inner(column(element, 'name'), 'grip')
    const from = grip.getBoundingClientRect()
    const y = from.top + from.height / 2
    pointer(grip, 'pointerdown', from.left + 2, y)
    pointer(window, 'pointermove', from.left + 6, y)
    pointer(window, 'pointerup', from.left + 6, y)
    await frames(element)
    expect(asked).toEqual([])
  })

  /* A hidden heading has no box, and its empty rect sat left of every pointer,
     so it counted as passed wherever it was: the column dropped past Size went
     past Kind too. */
  geometry('passes over a hidden heading, which keeps its place', async () => {
    const element = await table('reorderable')
    column(element, 'kind').hidden = true
    await frames(element)
    const asked: string[] = []
    element.addEventListener('helix-reorder', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const grip = inner(column(element, 'name'), 'grip')
    const from = grip.getBoundingClientRect()
    const past = heading(element, 'size')
    const y = from.top + from.height / 2
    pointer(grip, 'pointerdown', from.left + 2, y)
    pointer(window, 'pointermove', past.right - 4, y)
    pointer(window, 'pointerup', past.right - 4, y)
    await frames(element)
    expect(asked).toEqual(['size name kind'])
  })
})

/* Painted and read back, so two colors compare as pixels. Computed styles write
   one color several ways -- a token as `oklch(…)`, a `color-mix()` as
   `color(srgb …)` -- and comparing the strings compares the notation. */
const pixel = (color: string): number[] => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}
const distance = (a: string, b: string): number =>
  Math.max(...pixel(a).map((value, index) => Math.abs(value - (pixel(b)[index] ?? 0))))

describe('a chosen row', () => {
  geometry('is washed off the ground, and the rest are not', async () => {
    const element = await table('selectable default-selected="b"')
    const rows = [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="row"]') ?? [])]
    const fill = (row: HTMLElement | undefined): string =>
      getComputedStyle(row?.querySelector('[part~="cell"]') as Element).backgroundColor
    /* Against the ground itself, read inside the table so it inherits the same
       tokens. Against the unchosen row alone this passes with no wash at all,
       since that row is transparent and any opaque fill differs from it. */
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--helix-color-background)'
    element.shadowRoot?.append(probe)
    const ground = getComputedStyle(probe).backgroundColor
    probe.remove()

    expect(rows[1]?.getAttribute('aria-selected')).toBe('true')
    expect(distance(fill(rows[1]), ground)).toBeGreaterThan(4)
    expect(fill(rows[0])).toBe('rgba(0, 0, 0, 0)')
  })

  geometry('is chosen by a click on its checkbox', async () => {
    const element = await table('selectable')
    const box = element.shadowRoot?.querySelector(
      '[part~="select"] [part="checkbox"]',
    ) as HTMLElement
    box.shadowRoot?.querySelector('input')?.click()
    await frames(element)
    expect(element.selected).toBe('a')
  })
})
