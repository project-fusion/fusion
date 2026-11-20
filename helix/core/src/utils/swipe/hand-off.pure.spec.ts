import { describe, expect, test } from 'bun:test'
import { handsOver, roomToward, scrollsToStart } from './hand-off.js'

describe('handsOver', () => {
  test('takes a drag toward the edge once the list can scroll no further and has stood still', () => {
    expect(handsOver({ rest: 0, room: 0, still: true, toward: 12 })).toBe(true)
    expect(handsOver({ rest: 0, room: 40, still: true, toward: 12 })).toBe(false)
  })

  test('leaves a drag toward the edge to a list that moved within the lock', () => {
    expect(handsOver({ rest: 0, room: 0, still: false, toward: 12 })).toBe(false)
  })

  test('takes a drag away from the edge while the surface rests short of the whole', () => {
    expect(handsOver({ rest: 180, room: 40, still: false, toward: -12 })).toBe(true)
    expect(handsOver({ rest: 0, room: 0, still: true, toward: -12 })).toBe(false)
  })
})

describe('roomToward', () => {
  test('is the offset where the drag scrolls the list toward its start, and what is left past its end otherwise', () => {
    const at = { content: 900, frame: 300, offset: 200 }
    expect(scrollsToStart('bottom')).toBe(true)
    expect(roomToward('bottom', at)).toBe(200)
    expect(roomToward('right', at)).toBe(200)
    expect(roomToward('top', at)).toBe(400)
    expect(roomToward('left', { content: 900, frame: 300, offset: 600 })).toBe(0)
  })
})
