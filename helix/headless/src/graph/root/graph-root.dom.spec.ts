import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { GraphLink, GraphNode } from './graph-model.js'

/**
 * The height the headless tier does not choose, and the list cannot draw only
 * what is in view without.
 */
const LIST = `helix-headless-graph::part(list) {
  block-size: 12rem;
}`

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  const sheet = document.createElement('style')
  sheet.textContent = LIST
  document.head.append(sheet)
})

type Graph = HTMLElement & {
  active: string
  depth?: number | undefined
  drawn(whole?: boolean): void
  links: readonly GraphLink[]
  nodes: readonly GraphNode[]
  ready: boolean
  updateComplete: Promise<boolean>
}

const nodes: GraphNode[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
  { id: 'd', label: 'Delta' },
  { id: 'e', label: 'Echo' },
]
const links: GraphLink[] = [
  { source: 'a', target: 'b' },
  { source: 'c', target: 'a' },
  { source: 'd', target: 'e' },
]

const graph = async (extra = '', notes = nodes, between = links): Promise<Graph> => {
  const host = (await mount(
    `<helix-headless-graph label="Research notes" ${extra}><canvas></canvas></helix-headless-graph>`,
  )) as Graph
  host.nodes = notes
  host.links = between
  await settle(host)
  return host
}

const rows = (host: Graph): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
]
const names = (host: Graph): string[] =>
  rows(host).map((row) => row.querySelector('[part="note-name"]')?.textContent ?? '')
const list = (host: Graph): HTMLElement => part(host, 'list') as HTMLElement
const key = (target: Element, name: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: name }))
}

describe('graph frame', () => {
  test('is a named region with a named list of every note', async () => {
    const host = await graph()
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Research notes')
    expect(list(host).getAttribute('role')).toBe('listbox')
    expect(list(host).getAttribute('aria-label')).toBe('Notes')
    expect(names(host)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'])
    expect(part(host, 'count')?.textContent).toBe('5 notes')
  })

  test('lists the selected note first, then its links and backlinks, each said', async () => {
    const host = await graph('default-active="a"')
    expect(names(host)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'])
    const [selected, to, from] = rows(host)
    expect(selected?.getAttribute('aria-selected')).toBe('true')
    expect(selected?.getAttribute('part')).toContain('note-selected')
    expect(to?.getAttribute('aria-description')).toBe('Linked from Alpha')
    expect(from?.getAttribute('aria-description')).toBe('Links to Alpha')
    expect(to?.getAttribute('part')).toContain('note-linked')
    expect(rows(host)[3]?.hasAttribute('aria-description')).toBe(false)
  })

  test('moves a neighbor ahead of notes that sort before it', async () => {
    const host = await graph('default-active="e"')
    expect(names(host)).toEqual(['Echo', 'Delta', 'Alpha', 'Bravo', 'Charlie'])
  })

  test('a press on a note selects it and says so', async () => {
    const host = await graph()
    const told: string[] = []
    host.addEventListener('helix-activate', (event) => told.push(event.detail.value))
    rows(host)[2]?.click()
    await settle(host)
    expect(host.active).toBe('c')
    expect(told).toEqual(['c'])
    expect(names(host)[0]).toBe('Charlie')
  })

  test('a page that cancels the request keeps the selection where it was', async () => {
    const host = await graph('default-active="a"')
    host.addEventListener('helix-before-activate', (event) => event.preventDefault())
    rows(host)[2]?.click()
    await settle(host)
    expect(host.active).toBe('a')
  })

  test('the arrows move through the list, and Enter selects, without moving the drawing', async () => {
    const host = await graph()
    const panned: unknown[] = []
    host.addEventListener('helix-graph-pan', (event) => panned.push(event.detail))
    key(list(host), 'ArrowDown')
    key(list(host), 'ArrowDown')
    await settle(host)
    const scope = host.shadowRoot as ShadowRoot
    const current = scope.getElementById(list(host).getAttribute('aria-activedescendant') ?? '')
    expect(current?.getAttribute('part')).toContain('note-cursor')
    expect(current?.textContent).toContain('Charlie')
    key(list(host), 'End')
    await settle(host)
    expect(
      scope.getElementById(list(host).getAttribute('aria-activedescendant') ?? '')?.textContent,
    ).toContain('Echo')
    key(list(host), 'Enter')
    await settle(host)
    expect(host.active).toBe('e')
    expect(panned).toEqual([])
  })

  test('the arrows on the frame pan the drawing', async () => {
    const host = await graph()
    const panned: unknown[] = []
    host.addEventListener('helix-graph-pan', (event) => panned.push(event.detail))
    key(part(host, 'region') as HTMLElement, 'ArrowRight')
    expect(panned.length).toBe(1)
  })

  test('the zoom buttons ask the page to zoom', async () => {
    const host = await graph()
    const zoomed: unknown[] = []
    host.addEventListener('helix-graph-zoom', (event) => zoomed.push(event.detail))
    ;(part(host, 'zoom-in') as HTMLElement).click()
    expect(zoomed.length).toBe(1)
  })

  test('a search keeps the notes whose names hold it, and says how many', async () => {
    const host = await graph()
    const field = part(host, 'search-field') as HTMLInputElement
    field.value = 'ha'
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
    await settle(host)
    expect(names(host)).toEqual(['Alpha', 'Charlie'])
    expect(part(host, 'count')?.textContent).toBe('2 notes')
    expect(part(host, 'live')?.textContent).toBe('2 notes')
  })

  test('Escape empties a search, and the list holds every note again', async () => {
    const host = await graph()
    const field = part(host, 'search-field') as HTMLInputElement
    field.value = 'ha'
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
    await settle(host)
    key(field, 'Escape')
    await settle(host)
    expect(field.value).toBe('')
    expect(names(host).length).toBe(5)
  })

  test('ArrowDown in the search moves to the list, and the frame keeps its keys', async () => {
    const host = await graph()
    const panned: unknown[] = []
    host.addEventListener('helix-graph-pan', (event) => panned.push(event.detail))
    key(part(host, 'search-field') as HTMLElement, 'ArrowDown')
    key(part(host, 'search-field') as HTMLElement, 'ArrowLeft')
    expect(host.shadowRoot?.activeElement).toBe(list(host))
    expect(panned).toEqual([])
  })

  test('depth keeps the notes near the selected one, and shows every note without it', async () => {
    const host = await graph('default-active="a" depth="1"')
    expect(names(host)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    host.depth = undefined
    await settle(host)
    expect(names(host).length).toBe(5)
  })

  test('says it is drawn once, and again only after it was not', async () => {
    const host = await graph()
    let told = 0
    host.addEventListener('helix-graph-ready', () => told++)
    expect(host.ready).toBe(false)
    host.drawn()
    host.drawn()
    expect(told).toBe(1)
    expect(host.ready).toBe(true)
    expect(hasState(host, 'ready')).toBe(true)
    host.drawn(false)
    expect(hasState(host, 'ready')).toBe(false)
    host.drawn()
    expect(told).toBe(2)
  })

  test('draws a bounded number of rows however many notes there are', async () => {
    const many = Array.from({ length: 10000 }, (_, at) => ({ id: `n${at}`, label: `Note ${at}` }))
    const host = await graph('', many, [])
    expect(rows(host).length).toBeGreaterThan(0)
    expect(rows(host).length).toBeLessThan(100)
    expect(rows(host)[0]?.getAttribute('aria-setsize')).toBe('10000')
    expect(part(host, 'count')?.textContent).toBe('10,000 notes')
  })
})
