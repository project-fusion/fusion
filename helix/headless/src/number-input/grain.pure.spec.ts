import { describe, expect, test } from 'bun:test'
import { decimals, formatGrain, strideOf } from './grain.js'

describe('the grain of a format', () => {
  test('is the smallest amount the format shows', () => {
    expect(formatGrain('en-US', { currency: 'USD', style: 'currency' })).toBe(0.01)
    expect(formatGrain('en-US', { currency: 'JPY', style: 'currency' })).toBe(1)
    expect(formatGrain('en-US', {})).toBe(0.001)
    expect(formatGrain('en-US', { maximumFractionDigits: 1 })).toBe(0.1)
  })

  test('counts a percent a hundred times over', () => {
    expect(formatGrain('en-US', { style: 'percent' })).toBe(0.01)
    expect(formatGrain('en-US', { maximumFractionDigits: 1, style: 'percent' })).toBe(0.001)
  })
})

describe('the stride without a step', () => {
  test('is one percent for a percent and one otherwise', () => {
    expect(strideOf({ style: 'percent' })).toBe(0.01)
    expect(strideOf({ currency: 'USD', style: 'currency' })).toBe(1)
    expect(strideOf(undefined)).toBe(1)
  })
})

describe('the decimal places of a number', () => {
  test('are read off how it is written', () => {
    expect(decimals(0.25)).toBe(2)
    expect(decimals(3)).toBe(0)
    expect(decimals(1e-7)).toBe(7)
  })
})
