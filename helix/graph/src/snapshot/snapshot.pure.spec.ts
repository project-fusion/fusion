import { describe, expect, test } from 'bun:test'
import { pixelsOf } from '../connect-graph/sizes.js'
import { graphSnapshot } from './snapshot.js'

/** Three notes in a row, two groups, and a link from each end to the middle. */
const nodes = [
  { group: 'Sources', id: 'a', label: 'Alpha', x: 0, y: 0 },
  { group: 'Sources', id: 'b', label: 'Beta', x: 10, y: 0 },
  { group: 'Answers', id: 'c', label: 'Gamma <&>', x: 20, y: 10 },
]
const links = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
]

/** The attributes of each of a snapshot's elements of one kind. */
const elements = (svg: string, kind: string): Record<string, string>[] =>
  [...svg.matchAll(new RegExp(`<${kind} ([^>]*?)/?>`, 'g'))].map((match) =>
    Object.fromEntries(
      [...(match[1] as string).matchAll(/([a-z-]+)="([^"]*)"/g)].map((pair) => [
        pair[1] as string,
        pair[2] as string,
      ]),
    ),
  )

describe('graphSnapshot', () => {
  test('is empty where a note has no place, or there are no notes', () => {
    expect(graphSnapshot([{ id: 'a', x: 0 }], [])).toBe('')
    expect(graphSnapshot([], [])).toBe('')
  })

  test('is a hidden element the connector finds, which takes no pointer', () => {
    const svg = graphSnapshot(nodes, links)
    expect(svg.startsWith('<div aria-hidden="true" data-helix-graph-snapshot')).toBe(true)
    expect(svg).toContain('pointer-events:none')
  })

  test('fits the graph as Sigma does, up the page', () => {
    /* A graph twice as wide as tall in a box three times as wide: the
       height decides, the larger extent across twice the smaller side. */
    const svg = graphSnapshot(nodes, links, { height: 200, padding: 20, width: 600 })
    const circles = elements(svg, 'circle')
    const scale = ((200 - 40) * 2) / 20
    expect(circles.map((circle) => Number(circle.cx))).toEqual([
      300 - 10 * scale,
      300,
      300 + 10 * scale,
    ])
    expect(Number(circles[0]?.cy)).toBe(100 + 5 * scale)
    expect(Number(circles[2]?.cy)).toBe(100 - 5 * scale)
  })

  test('fits the box it is given in place of the box around the notes', () => {
    const svg = graphSnapshot(nodes, links, {
      bounds: { x: [-20, 40], y: [-25, 35] },
      height: 400,
      padding: 0,
      width: 400,
    })
    expect(Number(elements(svg, 'circle')[0]?.cx)).toBeCloseTo(200 - 10 * (400 / 60), 0)
  })

  test('draws a note as large as it is linked, where it gives no size', () => {
    const circles = elements(graphSnapshot(nodes, links), 'circle')
    expect(Number(circles[0]?.r)).toBe(Math.round(pixelsOf(2) * 10) / 10)
    expect(Number(circles[1]?.r)).toBe(Math.round(pixelsOf(1 + Math.SQRT2) * 10) / 10)
  })

  test('colors the groups by the series in the order of their names, and a tone over a group', () => {
    const svg = graphSnapshot(
      [...nodes.slice(0, 2), { ...(nodes[2] as (typeof nodes)[number]), tone: 'danger' as const }],
      links,
    )
    const fills = elements(svg, 'circle').map((circle) => circle.style)
    expect(fills[0]).toBe('fill:var(--helix-color-series-2)')
    expect(fills[2]).toBe('fill:var(--helix-color-danger)')
  })

  test('names every note it has room for with labels all, its text escaped', () => {
    const svg = graphSnapshot(nodes, links, { groupLabels: false, labels: 'all' })
    expect(svg).toContain('>Alpha</text>')
    expect(svg).toContain('>Gamma &lt;&amp;&gt;</text>')
    expect(graphSnapshot(nodes, links, { groupLabels: false })).not.toContain('</text>')
  })

  test('lights the selection as the drawing does, and fades the rest', () => {
    const svg = graphSnapshot(nodes, links, { active: 'c', groupLabels: false, reach: 'links' })
    /* The selected note named, its neighbor named, and the far note faded and unnamed. */
    expect(svg).toContain('>Gamma &lt;&amp;&gt;</text>')
    expect(svg).toContain('>Beta</text>')
    expect(svg).not.toContain('>Alpha</text>')
    expect(svg).toContain('color-mix(in srgb, var(--helix-color-surface-sunken) 75%')
    /* Upstream reaches the far note along both links. */
    const up = graphSnapshot(nodes, links, { active: 'c', groupLabels: false, reach: 'upstream' })
    expect(up).toContain('>Alpha</text>')
  })

  test('draws the shapes and emphases the notes ask for', () => {
    const svg = graphSnapshot(
      [
        { emphasis: 'outlined', id: 'a', x: 0, y: 0 },
        { id: 'b', shape: 'square', x: 10, y: 0 },
        { id: 'c', shape: 'diamond', x: 20, y: 0 },
      ],
      [],
    )
    expect(elements(svg, 'circle')[0]?.fill).toBe('none')
    expect(elements(svg, 'rect')).toHaveLength(1)
    expect(elements(svg, 'path')).toHaveLength(1)
  })
})
