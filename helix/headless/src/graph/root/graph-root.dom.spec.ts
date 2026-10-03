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

  test('legend names each group in the order of its name, pressed while its notes are shown', async () => {
    const grouped: GraphNode[] = [
      { group: 'work', id: 'a', label: 'Alpha' },
      { group: 'home', id: 'b', label: 'Bravo' },
      { group: 'work', id: 'c', label: 'Charlie', tone: 'danger' },
      { group: 'alerts', id: 'd', label: 'Delta', tone: 'danger' },
      { id: 'e', label: 'Echo' },
    ]
    const host = await graph('legend', grouped)
    const legend = part(host, 'legend') as HTMLElement
    expect(legend.getAttribute('role')).toBe('group')
    expect(legend.getAttribute('aria-label')).toBe('Groups')
    const items = [...legend.querySelectorAll('button')]
    expect(items.map((item) => item.textContent?.trim())).toEqual(['alerts', 'home', 'work'])
    expect(items.every((item) => item.getAttribute('aria-pressed') === 'true')).toBe(true)
    /* A tone every note in the group shares, which the drawing colors them by. */
    expect(items.map((item) => item.dataset.tone)).toEqual(['danger', undefined, undefined])
  })

  test('a press on a group hides its notes from the list and the drawing, and says so first', async () => {
    const grouped: GraphNode[] = [
      { group: 'work', id: 'a', label: 'Alpha' },
      { group: 'home', id: 'b', label: 'Bravo' },
      { group: 'work', id: 'c', label: 'Charlie' },
      { id: 'd', label: 'Delta' },
    ]
    const host = (await graph('legend', grouped)) as Graph & {
      hiddenGroups: readonly string[]
      shown?: ReadonlySet<string>
    }
    const told: (readonly string[])[] = []
    host.addEventListener('helix-graph-filter', (event) => told.push(event.detail.hidden))
    const work = () =>
      [...(part(host, 'legend')?.querySelectorAll('button') ?? [])].find(
        (item) => item.textContent?.trim() === 'work',
      )
    work()?.click()
    await settle(host)
    expect(told).toEqual([['work']])
    expect(host.hiddenGroups).toEqual(['work'])
    expect(names(host)).toEqual(['Bravo', 'Delta'])
    expect([...(host.shown ?? [])].sort()).toEqual(['b', 'd'])
    expect(work()?.getAttribute('aria-pressed')).toBe('false')
    expect(work()?.getAttribute('part')).toBe('legend-item legend-item-hidden')
    work()?.click()
    await settle(host)
    expect(host.hiddenGroups).toEqual([])
    expect(names(host).length).toBe(4)
  })

  test('a page that cancels the filter keeps every group as it was', async () => {
    const grouped: GraphNode[] = [
      { group: 'work', id: 'a' },
      { group: 'home', id: 'b' },
    ]
    const host = (await graph('legend', grouped)) as Graph & { hiddenGroups: readonly string[] }
    host.addEventListener('helix-graph-filter', (event) => event.preventDefault())
    part(host, 'legend')?.querySelector('button')?.click()
    await settle(host)
    expect(host.hiddenGroups).toEqual([])
    expect(names(host).length).toBe(2)
  })

  test('draws no legend for one group, or without legend', async () => {
    const one = await graph('legend', [{ group: 'work', id: 'a' }, { id: 'b' }])
    expect(part(one, 'legend')).toBeNull()
    const off = await graph('', [
      { group: 'work', id: 'a' },
      { group: 'home', id: 'b' },
    ])
    expect(part(off, 'legend')).toBeNull()
  })

  test('no-panel leaves the search and the list out, behind a button that opens them', async () => {
    const host = await graph('no-panel')
    const panel = part(host, 'panel') as HTMLElement
    const toggle = part(host, 'notes-toggle') as HTMLButtonElement
    expect(panel.hidden).toBe(true)
    expect(toggle.getAttribute('aria-label')).toBe('Notes')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(host.shadowRoot?.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBe(panel)
    toggle.click()
    await settle(host)
    expect(panel.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'search-field'))
    key(part(host, 'search-field') as HTMLElement, 'Escape')
    await settle(host)
    expect(panel.hidden).toBe(true)
    expect(host.shadowRoot?.activeElement).toBe(toggle)
  })

  test('without no-panel the list is beside the drawing and there is no button for it', async () => {
    const host = await graph()
    expect((part(host, 'panel') as HTMLElement).hidden).toBe(false)
    expect(part(host, 'notes-toggle')).toBeNull()
  })

  test('depth keeps nothing out once the selected note is taken away', async () => {
    const host = await graph('default-active="a" depth="1"')
    host.nodes = host.nodes.filter((node) => node.id !== 'a')
    await settle(host)
    expect(names(host).length).toBe(4)
  })

  test('cooperative: a plain wheel over the drawing is the page’s, and the frame says how to zoom', async () => {
    const host = await graph('gestures="cooperative"')
    const wheel = new WheelEvent('wheel', { bubbles: true, composed: true, deltaY: 40 })
    host.querySelector('canvas')?.dispatchEvent(wheel)
    await host.updateComplete
    const shown = part(host, 'gesture-hint') as HTMLElement
    expect(shown.hidden).toBe(false)
    expect(shown.textContent).toMatch(/^Use (Ctrl|⌘) and scroll to zoom the graph$/)
    expect((host as Graph & { gestureMode: string }).gestureMode).toBe('cooperative')
  })

  test('activate: the renderer takes nothing until the drawing is pressed, and a press on the list does not count', async () => {
    const host = (await graph('gestures="activate"')) as Graph & { gestureMode: string }
    const press = (on: Element): void => {
      on.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    }
    expect(host.gestureMode).toBe('off')
    press(rows(host)[0] as HTMLElement)
    await host.updateComplete
    expect(host.gestureMode).toBe('off')
    press(host.querySelector('canvas') as HTMLCanvasElement)
    await host.updateComplete
    expect(host.gestureMode).toBe('free')
    expect(hasState(host, 'using')).toBe(true)
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
