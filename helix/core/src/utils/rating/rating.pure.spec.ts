import { describe, expect, test } from 'bun:test'
import { ratingMarks } from '../derivations/derivations.js'
import {
  ratingAnswered,
  ratingAt,
  ratingFill,
  ratingKeyed,
  ratingScale,
  ratingScore,
  ratingStop,
} from './rating.js'

const FIVE = ratingScale(0, 5, 1)
const HALVES = ratingScale(0, 5, 0.5)

describe('rating arithmetic', () => {
  test('reads 5 marks and a whole step where a prop is no number', () => {
    expect(ratingScale('x', undefined, 'y')).toEqual(FIVE)
    expect(FIVE.positions).toEqual([1, 2, 3, 4, 5])
    expect(HALVES.positions).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
  })

  test('holds the floor between 0 and max, and leaves the steps below it out', () => {
    expect(ratingScale(2, 5, 1).steps).toEqual([2, 3, 4, 5])
    expect(ratingScale(-1, 5, 1).floor).toBe(0)
    expect(ratingScale(9, 5, 1).floor).toBe(5)
    expect(ratingScale(1.5, 5, 1).steps).toEqual([2, 3, 4, 5])
  })

  test('draws a value at its number held to the scale, and none at the floor', () => {
    expect(ratingScore('3.4', FIVE)).toBe(3.4)
    expect(ratingScore('9', FIVE)).toBe(5)
    expect(ratingScore('', ratingScale(2, 5, 1))).toBe(2)
    expect(ratingAnswered('')).toBe(false)
    expect(ratingAnswered('0')).toBe(true)
  })

  test('stands the choice on the nearest step, or the first where none is given', () => {
    expect(ratingStop('3.4', FIVE)).toBe(3)
    expect(ratingStop('', FIVE)).toBe(1)
    expect(ratingStop('', ratingScale(2, 5, 1))).toBe(2)
  })

  test('finds the step under a point along the row', () => {
    expect(ratingAt(0.5, FIVE)).toBe(3)
    expect(ratingAt(0, FIVE)).toBe(1)
    expect(ratingAt(1, FIVE)).toBe(5)
    expect(ratingAt(0.45, HALVES)).toBe(2.5)
    expect(ratingAt(0.1, ratingScale(2, 5, 1))).toBe(2)
  })

  test('moves the choice by the keys, without wrapping, and swaps Left and Right right to left', () => {
    expect(ratingKeyed('ArrowRight', 1, FIVE, false)).toBe(2)
    expect(ratingKeyed('ArrowDown', 5, FIVE, false)).toBe(5)
    expect(ratingKeyed('ArrowLeft', 1, FIVE, false)).toBe(1)
    expect(ratingKeyed('ArrowUp', 3, FIVE, false)).toBe(2)
    expect(ratingKeyed('ArrowLeft', 3, FIVE, true)).toBe(4)
    expect(ratingKeyed('Home', 3, FIVE, false)).toBe(1)
    expect(ratingKeyed('End', 3, FIVE, false)).toBe(5)
    expect(ratingKeyed('PageUp', 3, FIVE, false)).toBeUndefined()
  })

  test('fills whole marks and a share of the next', () => {
    expect(ratingFill(3.5)).toEqual({ full: 3, part: 0.5 })
    expect(ratingFill(0)).toEqual({ full: 0, part: 0 })
  })

  test('draws max rounded as marks', () => {
    expect(ratingMarks({ max: '7' })).toBe('7')
    expect(ratingMarks({})).toBe('5')
  })
})
