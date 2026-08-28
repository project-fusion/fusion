import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A chart finding the table it was pointed at, and noticing when it changes.
 *
 * Three decisions worth holding. What counts as a table is asked by role and by
 * tag rather than by `instanceof HTMLTableElement`, which throws on a server
 * where the constructor is not defined and fails for an element from another
 * document. The lookup goes through the host's root node, so a chart inside a
 * shadow root finds a table in that shadow root and not one in the page. And
 * the watch is what makes a chart follow a table somebody edits, which is the
 * whole reason this is a controller rather than a getter.
 */
let Controller: new (
  host: unknown,
) => {
  element: Element | null
  series: unknown[]
  hostConnected(): void
  hostDisconnected(): void
  watch(): void
}

beforeAll(async () => {
  registerDom()
  Controller = (await import('./source-controller.js'))
    .SourceController as unknown as typeof Controller
})

const chart = (forId: string, root: Document | ShadowRoot = document) => {
  let updates = 0
  const host = {
    addController: () => {},
    for: forId,
    getRootNode: () => root,
    requestUpdate: () => {
      updates += 1
    },
  }
  return { controller: new Controller(host), host, updates: () => updates }
}

describe('what it accepts as a source', () => {
  test('a real table', () => {
    document.body.innerHTML = '<table id="src"><tr><td>1</td></tr></table>'
    expect(chart('src').controller.element?.id).toBe('src')
  })

  /* By role as well as by tag, so a grid built out of divs is a source too, and
     so is a Helix table on either tier. */
  test('anything carrying the table or grid role', () => {
    document.body.innerHTML = '<div id="src" role="grid"></div>'
    expect(chart('src').controller.element?.id).toBe('src')
    document.body.innerHTML = '<div id="src" role="table"></div>'
    expect(chart('src').controller.element?.id).toBe('src')
  })

  test('and a Helix table on either tier, by name', () => {
    for (const tag of ['helix-table', 'helix-headless-table']) {
      document.body.innerHTML = `<${tag} id="src"></${tag}>`
      expect(chart('src').controller.element?.id, tag).toBe('src')
    }
  })

  test('but not something that is neither', () => {
    document.body.innerHTML = '<section id="src"></section>'
    expect(chart('src').controller.element).toBeNull()
  })
})

describe('when there is nothing to find', () => {
  test('an empty `for` looks for nothing rather than for everything', () => {
    document.body.innerHTML = '<table id="src"></table>'
    expect(chart('').controller.element).toBeNull()
  })

  test('a name that matches nothing answers null', () => {
    document.body.innerHTML = '<table id="src"></table>'
    expect(chart('missing').controller.element).toBeNull()
  })

  test('and the series is then empty rather than undefined', () => {
    document.body.innerHTML = ''
    expect(chart('missing').controller.series).toEqual([])
  })
})

describe('a table that changes under it', () => {
  /* The reason this is a controller. A consumer editing a cell, or a framework
     re-rendering rows, changes nothing the chart owns, so nothing would schedule
     an update and the drawing would keep the old numbers. */
  test('asks the host to update', async () => {
    document.body.innerHTML = '<table id="src"><tbody><tr><td>1</td></tr></tbody></table>'
    const chartOne = chart('src')
    chartOne.controller.hostConnected()
    const row = document.createElement('tr')
    row.innerHTML = '<td>2</td>'
    document.querySelector('tbody')?.append(row)
    await new Promise((done) => setTimeout(done, 0))
    expect(chartOne.updates()).toBeGreaterThan(0)
  })

  test('and stops asking once the chart is gone', async () => {
    document.body.innerHTML = '<table id="src"><tbody><tr><td>1</td></tr></tbody></table>'
    const chartOne = chart('src')
    chartOne.controller.hostConnected()
    chartOne.controller.hostDisconnected()
    const before = chartOne.updates()
    document.querySelector('tbody')?.append(document.createElement('tr'))
    await new Promise((done) => setTimeout(done, 0))
    expect(chartOne.updates()).toBe(before)
  })
})
