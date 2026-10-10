import { describe, expect, test } from 'bun:test'
import { closestName } from './closest-name.js'

describe('closestName', () => {
  test('is the name a letter or two away', () => {
    expect(closestName('chek', ['check', 'clock', 'x'])).toBe('check')
    expect(closestName('arrow-rigth', ['arrow-left', 'arrow-right'])).toBe('arrow-right')
  })

  test('counts two letters swapped as one change', () => {
    expect(closestName('chekc', ['check', 'circle'])).toBe('check')
  })

  test('is nothing past a third of the name, however close it sorts', () => {
    expect(closestName('x', ['y', 'xx'])).toBeUndefined()
    expect(closestName('button-x', ['button-background-color'])).toBeUndefined()
    expect(closestName('check', [])).toBeUndefined()
  })

  test('is the first of two at the same distance', () => {
    expect(closestName('stop', ['step', 'stub', 'shop'])).toBe('step')
  })
})
