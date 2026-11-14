import { afterEach, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '../../words/registry.js'
import {
  statFigure,
  statLabelLast,
  trendFigure,
  trendIsBetter,
  trendIsDown,
  trendIsUp,
  trendIsWorse,
  trendSays,
} from '../derivations/derivations.js'
import { trendReading } from './trend-props.js'

afterEach(() => clearWords())

describe('a trend from its props', () => {
  test('moves by `movement`, then the old `direction`, then the sign of `value`', () => {
    expect(trendReading({ direction: 'down', movement: 'up', value: -1 }).moved).toBe('up')
    expect(trendReading({ direction: 'down', value: 1 }).moved).toBe('down')
    expect(trendIsUp({ value: '0.12' })).toBe(true)
    expect(trendIsDown({ value: -3 })).toBe(true)
    expect(trendReading({ value: 0 }).moved).toBe('neutral')
    expect(trendReading({}).moved).toBeUndefined()
  })

  test('is better or worse by `good`, and neither where nothing moved', () => {
    expect(trendIsBetter({ good: 'up', movement: 'up' })).toBe(true)
    expect(trendIsWorse({ good: 'up', movement: 'down' })).toBe(true)
    expect(trendIsBetter({ good: 'up', movement: 'neutral' })).toBe(false)
    expect(trendIsWorse({ movement: 'down' })).toBe(false)
  })

  test('writes the size of the change, and its sign where `signDisplay` asks', () => {
    expect(
      trendFigure({ 'format-options': { style: 'percent' }, locale: 'en-US', value: -0.12 }),
    ).toBe('12%')
    expect(
      trendFigure({
        'format-options': '{"style":"percent","signDisplay":"always"}',
        locale: 'de',
        value: 0.12,
      }),
    ).toBe('+12 %')
    expect(trendFigure({ movement: 'up' })).toBe('')
  })

  test('says the movement, judged, in the words its props or the registry give', () => {
    expect(trendSays({ good: 'up', movement: 'up' })).toBe('Up, better')
    expect(trendSays({ good: 'down', movement: 'up' })).toBe('Up, worse')
    expect(trendSays({ movement: 'sideways' })).toBe('Unchanged')
    expect(trendSays({ 'down-label': 'Fell', movement: 'down' })).toBe('Fell')
    registerWords('de', { 'helix-trend': { downLabel: 'Gesunken', worseLabel: 'schlechter' } })
    expect(trendSays({ good: 'up', locale: 'de', movement: 'down' })).toBe('Gesunken, schlechter')
  })
})

describe('a stat from its props', () => {
  test('writes `value` in its locale, and nothing where it is no number', () => {
    expect(
      statFigure({ 'format-options': { notation: 'compact' }, locale: 'en-US', value: 1234567 }),
    ).toBe('1.2M')
    expect(statFigure({ locale: 'de', value: '1234.5' })).toBe('1.234,5')
    expect(statFigure({})).toBe('')
  })

  test('draws its label last under `column-reverse` alone', () => {
    expect(statLabelLast({ direction: 'column-reverse' })).toBe(true)
    expect(statLabelLast({ direction: 'row-reverse' })).toBe(false)
  })
})
