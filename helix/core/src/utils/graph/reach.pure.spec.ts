import { describe, expect, test } from 'bun:test'
import { reachOf } from './reach.js'

/* A source read by two memories, one of which a context reads, which an answer reads; and a cycle off to the side. */
const links = [
  { source: 'source', target: 'memory' },
  { source: 'source', target: 'other' },
  { source: 'memory', target: 'context' },
  { source: 'context', target: 'answer' },
  { source: 'loop', target: 'context' },
  { source: 'context', target: 'loop' },
]

describe('reachOf', () => {
  test('links reaches the notes the selected one links to and from, along the links that touch it', () => {
    const reached = reachOf('memory', links, 'links')
    expect([...reached.near].sort()).toEqual(['context', 'source'])
    expect(reached.along('source', 'memory')).toBe(true)
    expect(reached.along('context', 'answer')).toBe(false)
  })

  test('upstream reaches everything a path leads from, along the links on those paths', () => {
    const reached = reachOf('answer', links, 'upstream')
    expect([...reached.near].sort()).toEqual(['context', 'loop', 'memory', 'source'])
    expect(reached.along('source', 'memory')).toBe(true)
    expect(reached.along('memory', 'context')).toBe(true)
    /* The source's other reader leads nowhere near the answer. */
    expect(reached.along('source', 'other')).toBe(false)
  })

  test('downstream reaches everything a path leads to, along the links on those paths', () => {
    const reached = reachOf('memory', links, 'downstream')
    expect([...reached.near].sort()).toEqual(['answer', 'context', 'loop'])
    expect(reached.along('context', 'answer')).toBe(true)
    expect(reached.along('source', 'memory')).toBe(false)
  })

  test('a cycle ends the walk, and the selected note is never among what it reaches', () => {
    const reached = reachOf('loop', links, 'upstream')
    expect(reached.near.has('loop')).toBe(false)
    expect([...reached.near].sort()).toEqual(['context', 'memory', 'source'])
  })
})
