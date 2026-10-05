import { describe, expect, test } from 'bun:test'
import { pressedValues, toggledValues } from './selection.js'

describe('the pressed values of a group', () => {
  test('are read from the comma-separated value, with no empty entries', () => {
    expect(pressedValues('bold, italic,,')).toEqual(['bold', 'italic'])
    expect(pressedValues('')).toEqual([])
  })

  test('take or lose one value and keep the order the items are written in', () => {
    const order = ['bold', 'italic', 'underline']
    expect(toggledValues(['underline'], 'bold', order)).toEqual(['bold', 'underline'])
    expect(toggledValues(['bold', 'underline'], 'bold', order)).toEqual(['underline'])
  })
})
