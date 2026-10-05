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
  rows: { label: string }[]
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

  /* A framework page renders the chart first and the table once its data
     loads. Watching only what resolved on connect found nothing to watch, and
     the chart drew nothing until some unrelated property changed. */
  test('draws a table that arrives after it connected', async () => {
    document.body.innerHTML = '<div id="slot"></div>'
    const chartOne = chart('src')
    chartOne.controller.hostConnected()
    expect(chartOne.controller.element).toBeNull()
    const before = chartOne.updates()
    const slot = document.querySelector('#slot') as Element
    slot.innerHTML = '<table id="src"><tbody><tr><th>March</th><td>1</td></tr></tbody></table>'
    await new Promise((done) => setTimeout(done, 0))
    expect(chartOne.updates()).toBeGreaterThan(before)
    expect(chartOne.controller.element?.id).toBe('src')
    expect(chartOne.controller.rows.map((each) => each.label)).toEqual(['March'])
  })

  /* A re-keyed table is a new element under the old id, and the old one is
     detached: still watched, it reported nothing ever again. */
  test('follows a table replaced under the same id, and the edits to it', async () => {
    document.body.innerHTML =
      '<div id="slot"><table id="src"><tbody><tr><th>March</th><td>1</td></tr></tbody></table></div>'
    const chartOne = chart('src')
    chartOne.controller.hostConnected()
    const slot = document.querySelector('#slot') as Element
    slot.innerHTML = '<table id="src"><tbody><tr><th>June</th><td>6</td></tr></tbody></table>'
    await new Promise((done) => setTimeout(done, 0))
    const before = chartOne.updates()
    const row = document.createElement('tr')
    row.innerHTML = '<th>July</th><td>7</td>'
    document.querySelector('tbody')?.append(row)
    await new Promise((done) => setTimeout(done, 0))
    expect(chartOne.updates()).toBeGreaterThan(before)
    expect(chartOne.controller.rows.map((each) => each.label)).toEqual(['June', 'July'])
  })

  test('and stops asking once the chart is gone', async () => {
    document.body.innerHTML = '<table id="src"><tbody><tr><td>1</td></tr></tbody></table>'
    const chartOne = chart('src')
    chartOne.controller.hostConnected()
    chartOne.controller.hostDisconnected()
    const before = chartOne.updates()
    document.querySelector('tbody')?.append(document.createElement('tr'))
    document.body.innerHTML = '<table id="src"><tbody><tr><td>2</td></tr></tbody></table>'
    await new Promise((done) => setTimeout(done, 0))
    expect(chartOne.updates()).toBe(before)
  })
})

describe('what it parsed', () => {
  /* A render reads `series` several times over and the pointer reads the row
     count on every move, so a parse per read was a table walk per pointermove.
     The parse is held against the table and the edit it saw, and the same
     array comes back until one of them moves. */
  const TABLE = (id: string, rows: string) =>
    `<table id="${id}"><thead><tr><th>Month</th><th>Revenue</th></tr></thead><tbody>${rows}</tbody></table>`
  const ROW = (label: string, value: number) => `<tr><th>${label}</th><td>${value}</td></tr>`

  test('is the same array on every read until the table changes', () => {
    document.body.innerHTML = TABLE('src', ROW('March', 1))
    const one = chart('src')
    one.controller.hostConnected()
    expect(one.controller.series).toBe(one.controller.series)
    expect(one.controller.rows).toBe(one.controller.rows)
  })

  test('and a fresh one once an edit has been delivered', async () => {
    document.body.innerHTML = TABLE('src', ROW('March', 1))
    const one = chart('src')
    one.controller.hostConnected()
    const series = one.controller.series
    const rows = one.controller.rows
    const row = document.createElement('tr')
    row.innerHTML = '<th>April</th><td>2</td>'
    document.querySelector('tbody')?.append(row)
    await new Promise((done) => setTimeout(done, 0))
    expect(one.controller.series).not.toBe(series)
    expect(one.controller.rows).not.toBe(rows)
    expect(one.controller.rows.map((each) => each.label)).toEqual(['March', 'April'])
  })

  test('or once `for` names another table', () => {
    document.body.innerHTML = `${TABLE('src', ROW('March', 1))}${TABLE('other', ROW('May', 3))}`
    const one = chart('src')
    one.controller.hostConnected()
    const rows = one.controller.rows
    one.host.for = 'other'
    one.controller.watch()
    expect(one.controller.rows).not.toBe(rows)
    expect(one.controller.rows.map((each) => each.label)).toEqual(['May'])
  })

  /* Compared by identity rather than by id, so a table replaced under the same
     name, which a framework re-rendering a page does, is parsed again. */
  test('or once the table is a different element under the same id', () => {
    document.body.innerHTML = TABLE('src', ROW('March', 1))
    const one = chart('src')
    one.controller.hostConnected()
    const rows = one.controller.rows
    document.body.innerHTML = TABLE('src', ROW('June', 6))
    expect(one.controller.rows).not.toBe(rows)
    expect(one.controller.rows.map((each) => each.label)).toEqual(['June'])
  })
})
