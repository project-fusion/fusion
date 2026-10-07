import { describe, expect, test } from 'bun:test'
import { arrangement } from './arrange.js'
import type { CanvasEdge, CanvasNode } from './root/canvas-document.js'

const card = (id: string, x: number, y: number, width = 100, height = 50): CanvasNode => ({
  height,
  id,
  type: 'text',
  width,
  x,
  y,
})

const edge = (fromNode: string, toNode: string): CanvasEdge => ({
  fromNode,
  id: `${fromNode}-${toNode}`,
  toNode,
})

/** Whether any two of the boxes overlap, given where `arrangement` put them. */
const overlaps = (nodes: CanvasNode[], placed: Map<string, { x: number; y: number }>): boolean => {
  const boxes = nodes.map((node) => ({ ...node, ...placed.get(node.id) }))
  return boxes.some((a, i) =>
    boxes.some(
      (b, j) =>
        i < j &&
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height,
    ),
  )
}

describe('arrangement', () => {
  test('puts each card a layer past the cards that point to it', () => {
    const nodes = [card('c', 0, 0), card('a', 0, 0), card('b', 0, 0)]
    const placed = arrangement(nodes, [edge('a', 'b'), edge('b', 'c')])
    expect(placed.get('a')?.y).toBeLessThan(placed.get('b')?.y ?? 0)
    expect(placed.get('b')?.y).toBeLessThan(placed.get('c')?.y ?? 0)
    expect(overlaps(nodes, placed)).toBe(false)
  })

  test('runs the layers across with `direction: right`', () => {
    const nodes = [card('a', 0, 0), card('b', 0, 0)]
    const placed = arrangement(nodes, [edge('a', 'b')], { direction: 'right', gap: 20 })
    expect(placed.get('b')).toEqual({ x: 120, y: 0 })
  })

  test('lays cards with no connections out in a grid, in reading order', () => {
    const nodes = [card('a', 0, 0), card('b', 10, 10), card('c', 20, 20), card('d', 30, 30)]
    const placed = arrangement(nodes, [], { gap: 10 })
    expect([...placed.values()]).toEqual([
      { x: 0, y: 0 },
      { x: 110, y: 0 },
      { x: 0, y: 60 },
      { x: 110, y: 60 },
    ])
  })

  test('leaves no overlap on a board with a loop and cards of many sizes', () => {
    const nodes = [
      card('a', 0, 0, 300, 40),
      card('b', 5, 5, 80, 200),
      card('c', 10, 10),
      card('d', 15, 15, 150, 150),
      card('e', 20, 20),
    ]
    const placed = arrangement(nodes, [
      edge('a', 'b'),
      edge('b', 'c'),
      edge('c', 'a'),
      edge('a', 'd'),
    ])
    expect(overlaps(nodes, placed)).toBe(false)
  })

  test('moves a group as one box and keeps its cards inside it', () => {
    const nodes = [
      { ...card('g', 0, 0, 300, 200), type: 'group' as const },
      card('in', 20, 20),
      card('out', 400, 400),
    ]
    const placed = arrangement(nodes, [edge('out', 'in')])
    const group = placed.get('g')
    const inner = placed.get('in')
    expect((inner?.x ?? 0) - (group?.x ?? 0)).toBe(20)
    expect((inner?.y ?? 0) - (group?.y ?? 0)).toBe(20)
    expect(placed.get('out')?.y).toBeLessThan(group?.y ?? 0)
  })

  test('lands every card on a multiple of `snap`', () => {
    const nodes = [card('a', 3, 7), card('b', 50, 90, 70, 30)]
    const placed = arrangement(nodes, [edge('a', 'b')], {}, 32)
    for (const at of placed.values()) {
      expect(at.x % 32).toBe(0)
      expect(at.y % 32).toBe(0)
    }
  })
})
