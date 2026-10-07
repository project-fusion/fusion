import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { GraphNode } from './graph-model.js'

/**
 * Graph on the words registry: its words, the controls' words it takes from
 * the pan-and-zoom surface, and its count, which says one note in the
 * singular.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Graph = Updatable & { moved(): void; nodes: readonly GraphNode[]; zoom(by: number): void }

const NOTES: GraphNode[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
]

/** A graph in a container whose attributes set the page's language. */
const graph = async (around = '', notes = NOTES, extra = ''): Promise<Graph> => {
  document.body.innerHTML = `<div ${around}><helix-headless-graph label="Notes" ${extra}><canvas></canvas></helix-headless-graph></div>`
  const host = document.querySelector('helix-headless-graph') as Graph
  host.nodes = notes
  await settle(host)
  return host
}

const GERMAN = {
  'helix-graph': {
    controlsLabel: 'Graph-Steuerung',
    countLabel: '{count, plural, one {# Notiz} other {# Notizen}}',
    searchLabel: 'Notiz suchen',
    zoomedInLabel: 'Vergrößert',
    zoomInLabel: 'Vergrößern',
  },
}

describe('the count a graph says', () => {
  test('says one note in the singular', async () => {
    const host = await graph('', [{ id: 'a', label: 'Alpha' }])
    expect(part(host, 'count')?.textContent).toBe('1 note')
  })

  test('says any other number in the plural, in the locale', async () => {
    const host = await graph()
    expect(part(host, 'count')?.textContent).toBe('2 notes')
  })
})

describe('a graph on a page in another language', () => {
  test('is named by the fallback name registered for it where `label` is empty', async () => {
    registerWords('de', { 'helix-graph': { fallbackLabel: 'Notizgraph' } })
    document.body.innerHTML =
      '<div lang="de"><helix-headless-graph><canvas></canvas></helix-headless-graph></div>'
    const host = document.querySelector('helix-headless-graph') as Graph
    host.nodes = NOTES
    await settle(host)
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Notizgraph')
  })

  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('de', GERMAN)
    const host = await graph('lang="de"')
    expect(part(host, 'count')?.textContent).toBe('2 Notizen')
    expect(part(host, 'search-field')?.getAttribute('aria-label')).toBe('Notiz suchen')
  })

  test('names its controls with the words registered for it', async () => {
    registerWords('de', GERMAN)
    const host = await graph('lang="de"')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Graph-Steuerung')
    expect(part(host, 'zoom-in')?.getAttribute('aria-label')).toBe('Vergrößern')
  })

  test('keeps the English of its controls where nothing is registered', async () => {
    const host = await graph('lang="de"')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Graph controls')
  })

  test('keeps words a page wrote over the registry', async () => {
    registerWords('de', GERMAN)
    const host = await graph('lang="de"', NOTES, 'controls-label="Werkzeuge"')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Werkzeuge')
  })

  test('says a move in the words registered for it', async () => {
    registerWords('de', GERMAN)
    const host = await graph('lang="de"')
    host.zoom(1)
    host.moved()
    await settle(host)
    expect(part(host, 'live')?.textContent).toBe('Vergrößert')
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await graph('lang="de"')
    registerWords('de', GERMAN)
    await Promise.resolve()
    await settle(host)
    expect(part(host, 'count')?.textContent).toBe('2 Notizen')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Graph-Steuerung')
  })
})
