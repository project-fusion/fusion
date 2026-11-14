import { describe, expect, test } from 'bun:test'
import {
  areaKeyed,
  colorPresets,
  markAlong,
  nextColorFormat,
  wheelMark,
  wheelSlices,
} from './color-picker.js'

const red = { alpha: 100, brightness: 50, hue: 0, saturation: 50 }

describe('the keys on the square', () => {
  test('move both axes, by ten with Shift', () => {
    expect(areaKeyed(red, { key: 'ArrowUp', rtl: false, shift: false })).toEqual({ brightness: 51 })
    expect(areaKeyed(red, { key: 'ArrowLeft', rtl: false, shift: true })).toEqual({
      saturation: 40,
    })
    expect(areaKeyed(red, { key: 'End', rtl: false, shift: false })).toEqual({ saturation: 60 })
    expect(areaKeyed(red, { key: 'PageDown', rtl: false, shift: false })).toEqual({
      brightness: 40,
    })
  })

  test('turn the line on a right-to-left page', () => {
    expect(areaKeyed(red, { key: 'ArrowRight', rtl: true, shift: false })).toEqual({
      saturation: 49,
    })
    expect(areaKeyed(red, { key: 'Home', rtl: true, shift: false })).toEqual({ saturation: 60 })
  })

  test('hold each axis to its ends, and leave other keys alone', () => {
    const top = { ...red, brightness: 100 }
    expect(areaKeyed(top, { key: 'ArrowUp', rtl: false, shift: false })).toEqual({
      brightness: 100,
    })
    expect(areaKeyed(red, { key: 'a', rtl: false, shift: false })).toBeUndefined()
  })
})

describe('the syntax toggle', () => {
  test('walks the CSS syntaxes and comes round', () => {
    expect(nextColorFormat(undefined)).toBe('rgb')
    expect(nextColorFormat('oklch')).toBe('hex')
    expect(nextColorFormat('hsb')).toBe('hex')
  })
})

describe('the presets', () => {
  test('drop what is no color, and keep a comma inside one', () => {
    expect(colorPresets('#f00, nope, rgba(34,197,94,.5)')).toEqual(['#f00', 'rgba(34,197,94,.5)'])
  })
})

describe('the hue ring a phone draws', () => {
  test('has one wedge a band, clockwise from the top', () => {
    const slices = wheelSlices(0.2, 4)
    expect(slices.map((one) => one.hue)).toEqual([45, 135, 225, 315])
    expect(slices[0]?.d.startsWith('M50 0A50 50 0 0 1 ')).toBe(true)
  })

  test('stands a hue mark in the middle of the band', () => {
    expect(wheelMark(0, 0.2).x).toBe(0.5)
    expect(wheelMark(0, 0.2).y).toBeCloseTo(0.05)
    const right = wheelMark(90, 0.2)
    expect(right.x).toBeCloseTo(0.95)
    expect(right.y).toBeCloseTo(0.5)
  })
})

describe('the mark on the square', () => {
  test('stays half a mark inside each end', () => {
    expect(markAlong(0, 200, 16)).toBe(8)
    expect(markAlong(1, 200, 16)).toBe(192)
    expect(markAlong(0.5, 200, 16)).toBe(100)
  })
})
