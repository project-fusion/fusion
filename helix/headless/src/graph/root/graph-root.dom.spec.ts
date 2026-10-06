import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'
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
  test('every control’s glyph is a slot a page fills with its own icon, and the glyph stays where it does not', async () => {
    const host = await graph('controls="pan zoom fullscreen"')
    const plus = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    plus.setAttribute('slot', 'zoom-in-icon')
    host.append(plus)
    await settle(host)
    for (const name of [
      'fullscreen',
      'pan-down',
      'pan-end',
      'pan-start',
      'pan-up',
      'zoom-in',
      'zoom-out',
    ]) {
      expect(part(host, name)?.querySelector(`slot[name="${name}-icon"]`)).not.toBeNull()
    }
    const zoomIn = part(host, 'zoom-in')?.querySelector('slot') as HTMLSlotElement
    expect(zoomIn.assignedElements()).toEqual([plus as Element])
    expect(part(host, 'zoom-out')?.textContent?.trim()).toBe('−')
  })

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

  /* The list draws a window of its rows. End and Page Down pointed the active
     descendant at rows that were not drawn, wherever rows were not the 32
     pixels the window guessed, so a screen reader heard nothing. */
  const tall = Object.getOwnPropertyDescriptor(window, 'innerHeight')
  afterEach(() => {
    if (tall) {
      Object.defineProperty(window, 'innerHeight', tall)
    }
  })

  test('the row the keys are on is drawn wherever the window is', async () => {
    /* A page is the rows that fit, less one. happy-dom lays nothing out, so
       the list does not scroll, the window is the room, and a row is the
       32 pixel estimate: eleven fit in 352, and a page is ten. */
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 352 })
    const many = Array.from({ length: 500 }, (_, at) => ({ id: `n${at}`, label: `Note ${at}` }))
    const host = await graph('', many, [])
    const scope = host.shadowRoot as ShadowRoot
    for (const name of ['End', 'Home', 'PageDown', 'PageDown', 'PageDown']) {
      key(list(host), name)
      await settle(host)
      const id = list(host).getAttribute('aria-activedescendant') ?? ''
      expect(scope.getElementById(id)).not.toBeNull()
    }
    if (!hasLayout()) {
      expect(list(host).getAttribute('aria-activedescendant')).toBe('note-30')
    }
    const spacers = ['before', 'after'].map((name) => part(host, name)?.getAttribute('role'))
    expect(spacers).toEqual(['presentation', 'presentation'])
  })

  test('says what it shows as custom states: selected, local, searching and empty', async () => {
    const host = await graph()
    const states = (): string[] =>
      ['empty', 'local', 'searching', 'selected'].filter((name) => hasState(host, name))
    expect(states()).toEqual([])
    host.active = 'a'
    host.depth = 1
    await settle(host)
    expect(states()).toEqual(['local', 'selected'])
    const field = part(host, 'search-field') as HTMLInputElement
    field.value = 'zzz'
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
    await settle(host)
    expect(states()).toEqual(['empty', 'local', 'searching', 'selected'])
  })

  test('a letter moves to the next note whose name starts with it', async () => {
    const host = await graph()
    key(list(host), 'd')
    await settle(host)
    const scope = host.shadowRoot as ShadowRoot
    expect(
      scope.getElementById(list(host).getAttribute('aria-activedescendant') ?? '')?.textContent,
    ).toContain('Delta')
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

  test('says which way the drawing went once it has moved, and nothing before', async () => {
    const host = (await graph()) as Graph & { moved(): void }
    const region = part(host, 'region') as HTMLElement
    const live = () => part(host, 'live')?.textContent
    key(region, 'ArrowRight')
    await settle(host)
    expect(live()).toBe('')
    host.moved()
    await settle(host)
    expect(live()).toBe('Moved right')
    /* The same words again, which a region only reads when its text changes. */
    key(region, 'ArrowRight')
    host.moved()
    await settle(host)
    expect(live()).toBe('Moved right\u00a0')
    key(region, 'ArrowUp')
    host.moved()
    await settle(host)
    expect(live()).toBe('Moved up')
    ;(part(host, 'zoom-out') as HTMLElement).click()
    host.moved()
    await settle(host)
    expect(live()).toBe('Zoomed out')
    key(region, '=')
    host.moved()
    await settle(host)
    expect(live()).toBe('Zoomed in')
    /* A move nobody asked for is not said. */
    host.moved()
    await settle(host)
    expect(live()).toBe('Zoomed in')
  })

  test('a note arriving keeps the keys on the note they were on', async () => {
    const host = await graph()
    const current = () =>
      host.shadowRoot
        ?.getElementById(list(host).getAttribute('aria-activedescendant') ?? '')
        ?.querySelector('[part="note-name"]')?.textContent
    key(list(host), 'ArrowDown')
    key(list(host), 'ArrowDown')
    await settle(host)
    expect(current()).toBe('Charlie')
    host.nodes = [...nodes, { id: 'aa', label: 'Able' }]
    host.links = [...links, { source: 'aa', target: 'b' }]
    await settle(host)
    expect(names(host)[3]).toBe('Charlie')
    expect(current()).toBe('Charlie')
  })

  test('a note taken away leaves the keys on the row that took its place', async () => {
    const host = await graph()
    const current = () =>
      host.shadowRoot
        ?.getElementById(list(host).getAttribute('aria-activedescendant') ?? '')
        ?.querySelector('[part="note-name"]')?.textContent
    key(list(host), 'ArrowDown')
    key(list(host), 'ArrowDown')
    await settle(host)
    host.nodes = nodes.filter((node) => node.id !== 'c')
    await settle(host)
    expect(current()).toBe('Delta')
    host.nodes = nodes.filter((node) => node.id === 'a')
    await settle(host)
    expect(current()).toBe('Alpha')
  })

  test('a new selection still reads the list from its top', async () => {
    const host = await graph()
    key(list(host), 'End')
    await settle(host)
    host.active = 'c'
    await settle(host)
    expect(list(host).getAttribute('aria-activedescendant')).toBe('note-0')
    expect(names(host)[0]).toBe('Charlie')
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
    /* How many notes are left, which the list no longer says on its own. */
    expect(part(host, 'live')?.textContent).toBe('2 notes')
    work()?.click()
    await settle(host)
    expect(host.hiddenGroups).toEqual([])
    expect(names(host).length).toBe(4)
    expect(part(host, 'live')?.textContent).toBe('4 notes')
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
    expect(hasState(host, 'panel-open')).toBe(true)
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'search-field'))
    key(part(host, 'search-field') as HTMLElement, 'Escape')
    await settle(host)
    expect(panel.hidden).toBe(true)
    expect(hasState(host, 'panel-open')).toBe(false)
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

/**
 * What the console was warned while `markup` mounted and settled. The
 * warning is in development builds only: `test:dom` passes
 * `--conditions helix-development`, which core's `#audit-name` reads.
 */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await mount(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

describe('a graph with no name', () => {
  test('is reported once, by its tag', async () => {
    const warnings = (await warnedOn('<helix-headless-graph></helix-headless-graph>')).filter(
      (warning) => warning.includes('accessible name'),
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-graph> has no accessible name')
  })

  test('and one named by `label` or `aria-label` is not', async () => {
    for (const markup of [
      '<helix-headless-graph label="Research notes"></helix-headless-graph>',
      '<helix-headless-graph aria-label="Research notes"></helix-headless-graph>',
    ]) {
      const warnings = await warnedOn(markup)
      expect([
        markup,
        ...warnings.filter((warning) => warning.includes('accessible name')),
      ]).toEqual([markup])
    }
  })
})

describe('the events a graph sends', () => {
  /* The names Graph keeps, which follow Map's. A rename fails here before it
     reaches a page listening for the old name. */
  test('keep their names, and only the requests and news for a page leave the frame', async () => {
    const grouped: GraphNode[] = [
      { group: 'work', id: 'a', label: 'Alpha' },
      { group: 'home', id: 'b', label: 'Bravo' },
    ]
    const host = (await graph('legend', grouped)) as Graph & {
      laidOut(positions: Record<string, { x: number; y: number }>): void
      signal(from: string, to: string): void
    }
    const sent: [string, boolean, boolean, boolean][] = []
    const kinds = [
      'helix-graph-filter',
      'helix-graph-layout',
      'helix-graph-pan',
      'helix-graph-part-change',
      'helix-graph-ready',
      'helix-graph-signal',
      'helix-graph-zoom',
    ]
    for (const name of kinds) {
      host.addEventListener(name, (event) => {
        sent.push([event.type, event.bubbles, event.composed, event.cancelable])
        event.preventDefault()
      })
    }
    part(host, 'legend')?.querySelector('button')?.click()
    host.laidOut({ a: { x: 0, y: 0 } })
    key(part(host, 'region') as HTMLElement, 'ArrowRight')
    host.links = []
    await settle(host)
    host.drawn()
    host.signal('a', 'b')
    ;(part(host, 'zoom-in') as HTMLElement).click()
    expect(sent).toEqual([
      ['helix-graph-filter', true, true, true],
      ['helix-graph-layout', true, true, false],
      ['helix-graph-pan', true, true, false],
      ['helix-graph-part-change', false, false, false],
      ['helix-graph-ready', true, true, false],
      ['helix-graph-signal', false, false, false],
      ['helix-graph-zoom', true, true, false],
    ])
  })
})
