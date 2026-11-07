import { describe, expect, test } from 'bun:test'
import { checkEdit, readEdit, withValue } from './edit.js'

describe('what a reader typed', () => {
  test('is read as the column type', () => {
    expect(readEdit('1,250.5', 'number')).toBe(1250.5)
    expect(readEdit('', 'number')).toBeNull()
    expect(readEdit('twelve', 'number')).toBe('twelve')
    expect(readEdit('true', 'boolean')).toBe(true)
    expect(readEdit('2026-11-06', 'date')).toBe('2026-11-06')
  })
})

describe('the rules', () => {
  test('a required cell may not be left empty', () => {
    expect(checkEdit(' ', 'text', { required: true })).toEqual({ kind: 'required' })
    expect(checkEdit('', 'text', {})).toBeUndefined()
  })

  test('a number keeps to min and max, and has to be a number', () => {
    expect(checkEdit(-40, 'number', { min: '0' })).toEqual({ kind: 'min', min: '0' })
    expect(checkEdit(12, 'number', { max: '10' })).toEqual({ kind: 'max', max: '10' })
    expect(checkEdit('twelve', 'number', {})).toEqual({ kind: 'number' })
  })

  test('a date keeps to min and max', () => {
    expect(checkEdit('2026-01-01', 'date', { min: '2026-06-01' })).toEqual({
      kind: 'min',
      min: '2026-06-01',
    })
  })

  test('text matches the pattern whole', () => {
    expect(checkEdit('PO-12', 'text', { pattern: 'PO-\\d+' })).toBeUndefined()
    expect(checkEdit('xPO-12', 'text', { pattern: 'PO-\\d+' })).toEqual({ kind: 'pattern' })
  })
})

test('a value is written into a copy of the row, through a dot path', () => {
  const row = { id: 'A', owner: { name: 'Ada', team: 'Ops' } }
  const next = withValue(row, 'owner.name', 'Lin')
  expect(next).toEqual({ id: 'A', owner: { name: 'Lin', team: 'Ops' } })
  expect(row.owner.name).toBe('Ada')
})
