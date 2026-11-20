import { afterEach, describe, expect, test } from 'bun:test'
import { fakeEnvironment } from '../../capabilities/environment/fake.js'
import { environment, setEnvironment } from '../../capabilities/environment/index.js'
import {
  kbdKeyList,
  kbdKeys,
  kbdWords,
  meterSegmentAmount,
  meterSpan,
  stepSays,
} from './derivations.js'

const original = environment()

afterEach(() => {
  setEnvironment(original)
})

describe('a key’s chord', () => {
  test('is drawn in Apple glyphs on an iPhone and an iPad, and said in words', () => {
    setEnvironment(fakeEnvironment({ platform: 'ios' }))
    expect(kbdKeys({ keys: 'mod+shift+p' })).toBe('⇧⌘P')
    expect(kbdWords({ keys: 'mod+shift+p' })).toBe('Shift Command P')
  })

  test('is drawn and said in words elsewhere', () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    expect(kbdKeys({ keys: 'mod+k' })).toBe('Ctrl+K')
    expect(kbdWords({ keys: 'mod+k' })).toBe('Ctrl+K')
  })

  test('takes the names given for the keys, as JSON or as an object', () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    expect(kbdKeys({ 'key-labels': '{"mod":"Command"}', keys: 'mod+k' })).toBe('Command+K')
    expect(kbdKeys({ keyLabels: { enter: 'Return' }, keys: 'enter' })).toBe('Return')
    expect(kbdKeys({ 'key-labels': '{not json', keys: 'mod+k' })).toBe('Ctrl+K')
  })

  test('is nothing where there are no keys', () => {
    expect(kbdKeys({ keys: '' })).toBeUndefined()
    expect(kbdWords({})).toBeUndefined()
    expect(kbdKeyList({ keys: '' })).toEqual([])
  })

  test('is a list of its keys, each with the separator drawn before it', () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    expect(kbdKeyList({ keys: 'mod+k' })).toEqual([
      { at: '0', key: 'Ctrl', said: 'Ctrl', separator: '' },
      { at: '1', key: 'K', said: 'K', separator: '+' },
    ])
  })

  test('says each key in words where it is drawn in a glyph', () => {
    setEnvironment(fakeEnvironment({ platform: 'ios' }))
    expect(kbdKeyList({ keys: 'mod+k' })).toEqual([
      { at: '0', key: '⌘', said: 'Command', separator: '' },
      { at: '1', key: 'K', said: 'K', separator: '' },
    ])
  })
})

describe('a step’s words beside its name', () => {
  test('are its `complete-label` while it is complete, and nothing otherwise', () => {
    expect(stepSays({ complete: true, 'complete-label': 'Erledigt' })).toBe('Erledigt')
    expect(stepSays({ complete: true })).toBe('Complete')
    expect(stepSays({ complete: false, 'complete-label': 'Erledigt' })).toBeUndefined()
  })
})

describe('a meter’s segments', () => {
  test('divide by the range the meter holds, its top less its bottom', () => {
    expect(meterSpan({ max: 200, min: 50 })).toBe('150')
    expect(meterSpan({})).toBe('100')
    expect(meterSpan({ max: 0, min: 10 })).toBe('1')
  })

  test('each draw its value, and nothing where it is not a number or is below zero', () => {
    expect(meterSegmentAmount({ value: 12 })).toBe('12')
    expect(meterSegmentAmount({ value: '7.5' })).toBe('7.5')
    expect(meterSegmentAmount({ value: -3 })).toBe('0')
    expect(meterSegmentAmount({ value: 'many' })).toBe('0')
    expect(meterSegmentAmount({})).toBe('0')
  })
})
