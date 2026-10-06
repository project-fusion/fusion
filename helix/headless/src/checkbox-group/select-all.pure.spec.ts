import { describe, expect, test } from 'bun:test'
import { type SetBox, selectAllPress, selectAllState } from './select-all.js'

const set = (written: string): SetBox[] =>
  written.split(' ').map((box) => ({
    checked: box.includes('x'),
    disabled: box.includes('-'),
    value: box.replace(/[x-]/g, ''),
  }))

describe('select all', () => {
  test('is checked while every enabled box is, though a disabled box is clear', () => {
    expect(selectAllState(set('ax c d-'))).toEqual({ checked: false, indeterminate: true })
    expect(selectAllState(set('ax cx d-'))).toEqual({ checked: true, indeterminate: false })
  })

  test('is clear while no enabled box is checked, though a disabled box is', () => {
    expect(selectAllState(set('a c dx-'))).toEqual({ checked: false, indeterminate: false })
  })

  test('reads every box when every box is disabled, and an empty set as clear', () => {
    expect(selectAllState(set('ax- c-'))).toEqual({ checked: false, indeterminate: true })
    expect(selectAllState([])).toEqual({ checked: false, indeterminate: false })
  })
})

describe('a press on select all', () => {
  test('checks every enabled box while any is clear, and a disabled box keeps its state', () => {
    expect(selectAllPress(set('ax c dx- e-'))).toEqual([true, true, true, false])
  })

  test('clears every enabled box once all of them are checked', () => {
    expect(selectAllPress(set('ax cx d-'))).toEqual([false, false, false])
    expect(selectAllPress(set('ax cx dx-'))).toEqual([false, false, true])
  })

  test('moves boxes that share a value each on its own', () => {
    /* Boxes written with no value all submit `on`. */
    expect(selectAllPress(set('onx on on'))).toEqual([true, true, true])
  })

  test('leaves a set with no enabled box as it is', () => {
    expect(selectAllPress(set('ax- c-'))).toEqual([true, false])
    expect(selectAllPress([])).toEqual([])
  })
})
