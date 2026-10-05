import { describe, expect, test } from 'bun:test'
import { pressType } from './press-type.js'

/** A click as an engine sends it: a pointer kind where it has one, and a press count. */
const click = (pointerType: string | undefined, detail: number): MouseEvent =>
  ({ detail, pointerType }) as unknown as MouseEvent

describe('what a press came from', () => {
  test('a pointer kind on the click is the answer', () => {
    expect(pressType(click('mouse', 1))).toBe('mouse')
    expect(pressType(click('touch', 1))).toBe('touch')
    expect(pressType(click('pen', 1))).toBe('pen')
  })

  test('a click a key started is the keyboard, as Chromium sends it with no kind and no count', () => {
    expect(pressType(click('', 0), { key: true })).toBe('keyboard')
  })

  test('a click with nothing behind it is virtual: a screen reader or a script', () => {
    expect(pressType(click('', 0))).toBe('virtual')
    expect(pressType(click(undefined, 0), { pointer: 'touch' })).toBe('virtual')
  })

  test('a counted click without a kind takes the last pointer, or a mouse, as Safari sends it', () => {
    expect(pressType(click(undefined, 1), { pointer: 'touch' })).toBe('touch')
    expect(pressType(click(undefined, 1))).toBe('mouse')
  })
})
