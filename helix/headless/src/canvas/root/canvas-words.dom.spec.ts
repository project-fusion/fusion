import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Canvas on the words registry: the board speaks the words registered for the
 * page's language, writes its numbers and lists in it, and describes a card
 * as one list the language joins.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Canvas = Updatable & { selected: string; zoom(by: number): void }

const BOARD = `
  <helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
  <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
  <helix-headless-canvas-node name="c" x="130" y="300" width="200" height="100">Third</helix-headless-canvas-node>
  <helix-headless-canvas-edge name="e1" from="a" to="b"></helix-headless-canvas-edge>
  <helix-headless-canvas-edge name="e2" from="b" to="c" label="then"></helix-headless-canvas-edge>
  <helix-headless-canvas-edge name="e3" from="a" to="c"></helix-headless-canvas-edge>
`

const canvas = async (around = '', extra = 'label="A board"'): Promise<Canvas> => {
  document.body.innerHTML = `<div ${around}><helix-headless-canvas ${extra}>${BOARD}</helix-headless-canvas></div>`
  const host = document.querySelector('helix-headless-canvas') as Canvas
  await settle(host)
  await settle(host)
  return host
}

const about = (host: Canvas, name: string): string | null | undefined =>
  host.querySelector(`[name="${name}"]`)?.shadowRoot?.querySelector('#about')?.textContent

const said = (host: Canvas): string =>
  (part(host, 'live')?.textContent ?? '').replace(/\u00a0$/, '').trim()

const GERMAN = {
  'helix-canvas': {
    canvasLabel: 'Tafel',
    comesFromLabel: 'von {cards}',
    leadsToLabel: 'führt zu {cards}',
    linkedLabel: '{leadsTo}, {comesFrom}',
    selectedLabel: 'ausgewählt',
    zoomedLabel: 'Zoom {zoom}',
  },
}

describe('a board on a page in another language', () => {
  test('describes a card in the words registered for it, joined as the language joins a list', async () => {
    registerWords('de', GERMAN)
    const host = await canvas('lang="de"')
    expect(about(host, 'a')).toBe('führt zu Second und Third')
    expect(about(host, 'b')).toBe('führt zu Third, von First')
    host.selected = 'a,e2'
    await settle(host)
    await settle(host)
    expect(about(host, 'a')).toBe('ausgewählt und führt zu Second und Third')
    expect(
      host.shadowRoot?.querySelector('[data-edge="edge:e2"]')?.getAttribute('aria-description'),
    ).toBe('ausgewählt und then')
  })

  test('writes the zoom as the language writes a percentage', async () => {
    registerWords('de', GERMAN)
    const host = await canvas('lang="de"')
    host.zoom(1)
    await settle(host)
    expect(said(host)).toBe('Zoom 125\u00a0%')
  })

  test('names itself with its word where it has no `label`', async () => {
    registerWords('de', GERMAN)
    const host = await canvas('lang="de"', '')
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Tafel')
  })
})

describe('the words a board says in English', () => {
  test('are as before', async () => {
    const host = await canvas()
    expect(about(host, 'a')).toBe('leads to Second and Third')
    expect(about(host, 'b')).toBe('leads to Third; from First')
    host.selected = 'a,e2'
    await settle(host)
    await settle(host)
    expect(about(host, 'a')).toBe('selected, leads to Second and Third')
    expect(
      host.shadowRoot?.querySelector('[data-edge="edge:e2"]')?.getAttribute('aria-description'),
    ).toBe('selected, then')
    host.zoom(1)
    await settle(host)
    expect(said(host)).toBe('Zoom 125%')
  })
})
