import { describe, expect, test } from 'bun:test'
import type { CanvasNode } from '../root/canvas-document.js'
import { parseCanvas, pasteInto } from './place.js'

const card = (id: string, x: number, y: number): CanvasNode => ({
  height: 50,
  id,
  type: 'text',
  width: 100,
  x,
  y,
})

describe('parseCanvas', () => {
  test('reads a JSON Canvas document, and leaves out connections to cards it does not hold', () => {
    const text = JSON.stringify({
      edges: [
        { fromNode: 'a', id: 'e1', toNode: 'b' },
        { fromNode: 'a', id: 'e2', toNode: 'gone' },
      ],
      nodes: [card('a', 0, 0), card('b', 200, 0)],
    })
    expect(parseCanvas(text)?.edges?.map((edge) => edge.id)).toEqual(['e1'])
  })

  test('reads nothing from text that is not a board', () => {
    expect(parseCanvas('Hello')).toBeUndefined()
    expect(parseCanvas('{"nodes":[]}')).toBeUndefined()
    expect(parseCanvas('{"nodes":[{"id":"a","type":"text","x":0}]}')).toBeUndefined()
    expect(parseCanvas('null')).toBeUndefined()
  })
})

describe('pasteInto', () => {
  test('moves pasted cards off the ones they were copied from, and gives them new ids', () => {
    const board = [card('a', 0, 0), card('b', 200, 0)]
    const out = pasteInto(
      { edges: [{ fromNode: 'a', id: 'e1', toNode: 'b' }], nodes: board },
      board,
      new Set(['e1']),
      32,
    )
    expect(out.nodes?.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 'a-2', x: 32, y: 32 },
      { id: 'b-2', x: 232, y: 32 },
    ])
    expect(out.edges?.[0]).toMatchObject({ fromNode: 'a-2', id: 'e1-2', toNode: 'b-2' })
  })

  test('moves a second paste clear of the first', () => {
    const board = [card('a', 0, 0), card('a-2', 32, 32)]
    const out = pasteInto({ nodes: [card('a', 0, 0)] }, board, new Set(), 32)
    expect(out.nodes?.[0]).toMatchObject({ id: 'a-3', x: 64, y: 64 })
  })

  test('keeps cards from another board where they were', () => {
    const out = pasteInto({ nodes: [card('x', 500, 500)] }, [card('a', 0, 0)], new Set(), 32)
    expect(out.nodes?.[0]).toMatchObject({ id: 'x', x: 500, y: 500 })
  })
})
