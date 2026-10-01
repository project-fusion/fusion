import { describe, expect, test } from 'bun:test'
import { type DrawnLink, type DrawnNode, diffGraph, isEmpty, linkKey } from './diff.js'

const nodes = (...list: DrawnNode[]) => new Map(list.map((node) => [node.id, node]))
const links = (...list: DrawnLink[]) => new Map(list.map((link) => [linkKey(link), link]))
const note = (id: string, x = 0, label = id): DrawnNode => ({ id, label, size: 1, x, y: 0 })

describe('diffGraph', () => {
  test('is empty where nothing changed', () => {
    const graph = { links: links({ source: 'a', target: 'b' }), nodes: nodes(note('a'), note('b')) }
    expect(isEmpty(diffGraph(graph, graph))).toBe(true)
  })

  test('says what was added, what was taken away, and what moved or was renamed', () => {
    const changes = diffGraph(
      { links: links({ source: 'a', target: 'b' }), nodes: nodes(note('a'), note('b'), note('c')) },
      {
        links: links({ source: 'a', target: 'd' }),
        nodes: nodes(note('a'), note('b', 5), note('c', 0, 'Charlie'), note('d')),
      },
    )
    expect(changes.addNodes.map((node) => node.id)).toEqual(['d'])
    expect(changes.changeNodes.map((node) => node.id)).toEqual(['b', 'c'])
    expect(changes.removeNodes).toEqual([])
    expect(changes.addLinks).toEqual([{ source: 'a', target: 'd' }])
    expect(changes.removeLinks).toEqual([{ source: 'a', target: 'b' }])
  })

  test('a note taken away is named, and a link renamed is drawn again', () => {
    const changes = diffGraph(
      {
        links: links({ label: 'cites', source: 'a', target: 'b' }),
        nodes: nodes(note('a'), note('b'), note('c')),
      },
      {
        links: links({ label: 'quotes', source: 'a', target: 'b' }),
        nodes: nodes(note('a'), note('b')),
      },
    )
    expect(changes.removeNodes).toEqual(['c'])
    expect(changes.removeLinks).toEqual([{ label: 'cites', source: 'a', target: 'b' }])
    expect(changes.addLinks).toEqual([{ label: 'quotes', source: 'a', target: 'b' }])
  })
})
