import { describe, expect, test } from 'bun:test'
import { plainClick } from './plain-click.js'

const click = (init: Partial<MouseEvent>): MouseEvent =>
  ({
    altKey: false,
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...init,
  }) as MouseEvent

describe('a plain click', () => {
  test('is the main button with nothing held', () => {
    expect(plainClick(click({}))).toBe(true)
  })

  test('and not another button, or any modifier', () => {
    for (const init of [
      { button: 1 },
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
    ]) {
      expect([init, plainClick(click(init))]).toEqual([init, false])
    }
  })
})
