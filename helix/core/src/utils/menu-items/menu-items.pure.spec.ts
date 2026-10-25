import { describe, expect, test } from 'bun:test'
import { checkedStateOf, kindOf, nextChecked, roleOf, runAround } from './menu-items.js'

const item = (
  over: Partial<{ checkable: boolean; checked: boolean; exclusive: boolean }> = {},
) => ({
  checkable: false,
  checked: false,
  exclusive: false,
  ...over,
})

describe('an item of a mixed set', () => {
  test('is a command, a choice, or one of a run, and takes the role of its kind', () => {
    expect(kindOf(item())).toBe('command')
    expect(kindOf(item({ checkable: true }))).toBe('checkable')
    expect(kindOf(item({ checked: true }))).toBe('checkable')
    expect(kindOf(item({ checkable: true, exclusive: true }))).toBe('exclusive')
    expect(roleOf('command')).toBe('menuitem')
    expect(roleOf('checkable')).toBe('menuitemcheckbox')
    expect(roleOf('exclusive')).toBe('menuitemradio')
  })

  test('says it is checked only where it is a choice', () => {
    expect(checkedStateOf(item())).toBeNull()
    expect(checkedStateOf(item({ checkable: true }))).toBe('false')
    expect(checkedStateOf(item({ checked: true }))).toBe('true')
    expect(checkedStateOf(item({ exclusive: true }))).toBe('false')
  })

  test('turns over as a choice, only turns on as one of a run, and never as a command', () => {
    expect(nextChecked(item({ checkable: true }))).toBe(true)
    expect(nextChecked(item({ checked: true }))).toBe(false)
    expect(nextChecked(item({ exclusive: true }))).toBe(true)
    expect(nextChecked(item({ checked: true, exclusive: true }))).toBeUndefined()
    expect(nextChecked(item())).toBeUndefined()
  })
})

describe('the run an item stands in', () => {
  const rows = ['a', 'b', '|', 'c', 'd', 'e']
  const inRun = (row: string) => row !== '|'

  test('is the siblings next to it up to the first that is not one, nearest first', () => {
    expect(runAround(rows, 4, inRun)).toEqual(['c', 'e'])
    expect(runAround(rows, 0, inRun)).toEqual(['b'])
    expect(runAround(rows, 5, inRun)).toEqual(['d', 'c'])
  })

  test('is empty for an item outside a run and for a place with no item', () => {
    expect(runAround(rows, 2, inRun)).toEqual([])
    expect(runAround(rows, 9, inRun)).toEqual([])
  })
})
