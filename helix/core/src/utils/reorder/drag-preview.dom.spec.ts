import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Module = typeof import('./drag-preview.js')

let boxOf: Module['boxOf']
let dragPreviewOf: Module['dragPreviewOf']

beforeAll(async () => {
  registerDom()
  ;({ boxOf, dragPreviewOf } = await import('./drag-preview.js'))
})

const made: Element[] = []
afterEach(() => {
  for (const one of made.splice(0)) {
    one.remove()
  }
})

/* An element with a box where a spec says, as a browser would measure it. */
const at = <T extends Element>(element: T, box: DOMRect): T => {
  element.getBoundingClientRect = () => box
  return element
}

/* A row as a family draws one: a custom element whose shadow root holds a
   grid, a slot for the page's words, and a grip, with an id on the grid. */
const row = (): HTMLElement => {
  const host = at(document.createElement('x-row'), new DOMRect(10, 100, 200, 40))
  const root = host.attachShadow({ mode: 'open' })
  const grid = at(document.createElement('div'), new DOMRect(10, 100, 200, 40))
  grid.id = 'grid'
  grid.style.display = 'grid'
  const slot = document.createElement('slot')
  const grip = at(document.createElement('button'), new DOMRect(180, 110, 20, 20))
  grip.append('Move')
  grid.append(slot, grip)
  root.append(grid)
  host.append('Alpha')
  document.body.append(host)
  made.push(host)
  return host
}

describe('a copy of an item', () => {
  /* The copy as the preview holds it, measured from the item's own box. */
  const copied = (element: Element): HTMLElement =>
    dragPreviewOf(element, true, boxOf(element))[0] as HTMLElement

  test('draws its words through its shadow root and slots, in plain boxes', () => {
    const copy = copied(row())
    expect(copy.textContent).toBe('AlphaMove')
    expect(copy.querySelector('x-row, slot')).toBeNull()
    expect(copy.querySelector('[id]')).toBeNull()
    expect(copy.localName).toBe('div')
    expect(copy.querySelector('button')?.textContent).toBe('Move')
  })

  test('is the size of the item where it is, and puts what a grid lays out where it is', () => {
    const copy = copied(row())
    expect([copy.style.position, copy.style.left, copy.style.top]).toEqual([
      'absolute',
      '0px',
      '0px',
    ])
    expect([copy.style.width, copy.style.height]).toEqual(['200px', '40px'])
    /* The grid flows in the copy as it did in the item. */
    const grid = copy.firstElementChild as HTMLElement
    expect(grid.style.position).not.toBe('absolute')
    /* In a grid, so placed where it is rather than on a track the copy does
       not have, measured from the item, the nearest box placed. */
    const grip = copy.querySelector('button') as HTMLElement
    expect(grip.style.position).toBe('absolute')
    expect([grip.style.left, grip.style.top, grip.style.width]).toEqual(['170px', '10px', '20px'])
  })

  test('leaves out what the item does not draw', () => {
    const host = row()
    const hidden = document.createElement('span')
    hidden.style.display = 'none'
    hidden.append('Secret')
    host.append(hidden)
    expect(copied(host).textContent).not.toContain('Secret')
  })

  test('keeps a picture whole', () => {
    const host = row()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
    host.shadowRoot?.querySelector('button')?.append(svg)
    expect(copied(host).querySelector('svg path')).not.toBeNull()
  })
})

describe('an item that draws no box of its own', () => {
  test('is measured around what it draws, and each thing it draws is put where it is', () => {
    const line = document.createElement('div')
    line.style.display = 'contents'
    line.append(
      at(document.createElement('span'), new DOMRect(0, 50, 100, 30)),
      at(document.createElement('span'), new DOMRect(100, 50, 60, 32)),
    )
    document.body.append(line)
    made.push(line)
    const box = boxOf(line)
    expect([box.left, box.top, box.width, box.height]).toEqual([0, 50, 160, 32])
    const copy = dragPreviewOf(line, true, box)[0] as HTMLElement
    const cells = [...copy.children] as HTMLElement[]
    expect(cells.map((cell) => [cell.style.left, cell.style.top, cell.style.position])).toEqual([
      ['0px', '0px', 'absolute'],
      ['100px', '0px', 'absolute'],
    ])
  })
})
