import { describe, expect, test } from 'bun:test'
import { closesPeers, keepsOpen, modeOf, settled } from './opening'

describe('the modes of a set whose items open', () => {
  test('reads multiple where the prop holds nothing the set knows', () => {
    expect(modeOf(undefined)).toBe('multiple')
    expect(modeOf('several')).toBe('multiple')
    expect(modeOf('single-collapsible')).toBe('single-collapsible')
  })

  test('keeps the open item open under single alone', () => {
    expect(keepsOpen('single', false)).toBe(true)
    expect(keepsOpen('single', true)).toBe(false)
    expect(keepsOpen('single-collapsible', false)).toBe(false)
    expect(keepsOpen('multiple', false)).toBe(false)
  })

  test('closes the other items as one opens, except under multiple', () => {
    expect(closesPeers('multiple')).toBe(false)
    expect(closesPeers('single')).toBe(true)
    expect(closesPeers('single-collapsible')).toBe(true)
  })

  test('settles on the first open item, and the first item under single where none is open', () => {
    expect(settled('single', [false, true, true])).toEqual([false, true, false])
    expect(settled('single', [false, false])).toEqual([true, false])
    expect(settled('single-collapsible', [false, false])).toBeUndefined()
    expect(settled('single-collapsible', [true, false])).toBeUndefined()
    expect(settled('multiple', [true, true])).toBeUndefined()
  })
})
