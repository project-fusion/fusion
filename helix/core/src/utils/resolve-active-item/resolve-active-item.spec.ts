import { describe, expect, test } from 'bun:test'
import { resolveActiveItem } from './resolve-active-item.js'

/**
 * `items.find(match) ?? items[0]` written once instead of four times, and the
 * asymmetry in it is the whole reason it is a function.
 *
 * The match honors a disabled item and the fallback refuses one, which reads
 * like an inconsistency and is the point: naming a disabled item is a consumer's
 * decision and quietly moving off it would be the component overruling them,
 * while falling back *onto* one is the component choosing, and it should not
 * choose something out of play. All four hand-written copies took `items[0]`
 * either way, so a set opening on a disabled first item showed it as current.
 */
const items = (...spec: (string | [string, 'disabled'])[]) =>
  spec.map((one) => (typeof one === 'string' ? { value: one } : { disabled: true, value: one[0] }))

describe('the item a value names', () => {
  test('is the one it names', () => {
    expect(resolveActiveItem('b', items('a', 'b', 'c'))?.value).toBe('b')
  })

  test('and a disabled one still counts, because naming it was a decision', () => {
    expect(resolveActiveItem('b', items('a', ['b', 'disabled'], 'c'))?.value).toBe('b')
  })
})

describe('a value that names nothing', () => {
  /* Every set before its consumer has chosen, and every set whose current item
     has just been removed. */
  test('falls back to the first item, so a set always shows something', () => {
    expect(resolveActiveItem('', items('a', 'b'))?.value).toBe('a')
    expect(resolveActiveItem('gone', items('a', 'b'))?.value).toBe('a')
  })

  test('and skips a disabled one, because that choice is the component’s', () => {
    expect(resolveActiveItem('', items(['a', 'disabled'], 'b'))?.value).toBe('b')
  })

  test('skipping as many as it has to', () => {
    expect(resolveActiveItem('', items(['a', 'disabled'], ['b', 'disabled'], 'c'))?.value).toBe('c')
  })

  test('and gives up rather than choosing one that is out of play', () => {
    expect(resolveActiveItem('', items(['a', 'disabled'], ['b', 'disabled']))).toBeUndefined()
  })
})

describe('an empty set', () => {
  test('resolves to nothing rather than throwing', () => {
    expect(resolveActiveItem('a', [])).toBeUndefined()
  })
})
