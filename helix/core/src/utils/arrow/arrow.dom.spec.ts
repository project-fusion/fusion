import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { arrowReach, sideOf } from './arrow.js'

beforeAll(() => {
  registerDom()
})

describe('a panel arrow', () => {
  test('reaches n / sqrt(2) past the edge it sits on, and nothing where there is none', () => {
    const point = document.createElement('div')
    Object.defineProperty(point, 'offsetWidth', { value: 10 })
    expect(arrowReach(point)).toBeCloseTo(7.071, 3)
    expect(arrowReach(null)).toBe(0)
    expect(arrowReach(undefined)).toBe(0)
  })

  test('points from the side a placement lands on', () => {
    expect(sideOf('top')).toBe('top')
    expect(sideOf('bottom-start')).toBe('bottom')
    expect(sideOf('left-end')).toBe('left')
  })
})
