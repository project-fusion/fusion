import { describe, expect, test } from 'bun:test'
import { type SetBox, selectAllState } from './select-all.js'

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
