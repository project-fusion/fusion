import { describe, expect, test } from 'bun:test'
import { sliderMarked, sliderMarkers, sliderReserve } from '../derivations/derivations.js'
import {
  sliderAt,
  sliderBounds,
  sliderFill,
  sliderFraction,
  sliderMarks,
  sliderSaid,
  sliderSettle,
  sliderSpoken,
  sliderValue,
} from './slider.js'

const PERCENT = sliderBounds(0, 100, 1)

describe('slider arithmetic', () => {
  test('reads bounds that are no number as a native range does', () => {
    expect(sliderBounds('0', '1OO', 'x')).toEqual({ max: 100, min: 0, step: 1 })
    expect(sliderBounds(-10, 10, 0.5)).toEqual({ max: 10, min: -10, step: 0.5 })
  })

  test('holds a value to its bounds and its step, counted from min', () => {
    expect(sliderSettle(150, PERCENT)).toBe(100)
    expect(sliderSettle(-3, PERCENT)).toBe(0)
    expect(sliderSettle(0.27, sliderBounds(0.2, 1, 0.05))).toBe(0.25)
    expect(sliderSettle(0.3000001, sliderBounds(0, 1, 0.1))).toBe(0.3)
    expect(sliderSettle(37, sliderBounds(0, 100, 25))).toBe(25)
  })

  test('starts in the middle where the text is no number', () => {
    expect(sliderValue('', PERCENT)).toBe(50)
    expect(sliderValue('42', PERCENT)).toBe(42)
  })

  test('places a value along the track, and a fraction back on a step', () => {
    expect(sliderFraction(25, PERCENT)).toBe(0.25)
    expect(sliderFraction(5, sliderBounds(5, 5, 1))).toBe(0)
    expect(sliderAt(0.333, sliderBounds(0, 100, 10))).toBe(30)
    expect(sliderAt(2, PERCENT)).toBe(100)
  })

  test('fills from its origin to the value', () => {
    expect(sliderFill(0.3, undefined)).toEqual([0, 0.3])
    expect(sliderFill(0.3, 'center')).toEqual([0.3, 0.5])
    expect(sliderFill(0.7, 'end')).toEqual([0.7, 1])
  })

  test('snaps each mark to a step, so no mark stands where the thumb cannot', () => {
    expect(sliderMarks(5, PERCENT)).toEqual([0, 25, 50, 75, 100])
    expect(sliderMarks(4, sliderBounds(0, 100, 25))).toEqual([0, 25, 75, 100])
    expect(sliderMarks(1, PERCENT)).toEqual([])
  })

  test('says a value in its sentence or its format, and nothing for the number alone', () => {
    expect(sliderSpoken(40, undefined, '', '')).toBe('')
    expect(sliderSpoken(40, undefined, '', '{value} degrees')).toBe('40 degrees')
    expect(sliderSpoken(0.4, { style: 'percent' }, 'en-US', '')).toBe('40%')
  })

  test('writes a value in its format', () => {
    expect(sliderSaid(40, undefined, '')).toBe('40')
    expect(sliderSaid(0.4, '{"style":"percent"}', 'en-US')).toBe('40%')
  })
})

describe('slider derivations', () => {
  test('lays each mark with its place and its label', () => {
    expect(sliderMarkers({ markers: 3, max: 10, min: 0 })).toEqual([
      { at: '0', label: '0', place: '0%' },
      { at: '5', label: '5', place: '50%' },
      { at: '10', label: '10', place: '100%' },
    ])
  })

  test('says whether marks are drawn, two or more', () => {
    expect(sliderMarked({ markers: 5 })).toBe(true)
    expect(sliderMarked({ markers: 1 })).toBe(false)
    expect(sliderMarked({ markers: 5, max: 0, min: 0 })).toBe(false)
  })

  test('keeps the readout as wide as the wider bound', () => {
    expect(sliderReserve({ max: 100, min: 0 })).toBe('3ch')
    expect(sliderReserve({ max: 5, min: -10 })).toBe('3ch')
  })
})
