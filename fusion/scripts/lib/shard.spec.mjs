import { afterEach, describe, expect, test } from 'bun:test'
import { assign, owner, shard, which } from './shard.mjs'

/* Sixty families weighing what parity's did on 15 Sep 2026 in shape: most
   small, a few large, several equal. */
const families = Array.from({ length: 60 }, (_, at) => `family-${String(at).padStart(2, '0')}`)
const weights = new Map(families.map((one, at) => [one, at % 7 === 0 ? 30 : (at % 5) + 1]))
const weigh = (family) => weights.get(family)

const argv = process.argv
afterEach(() => {
  process.argv = argv
})

describe('the split', () => {
  test('every family lands in exactly one shard, so the shards are the whole run', () => {
    for (const of of [1, 2, 4, 7, 60, 90]) {
      const placed = assign(families, weigh, of)
      expect([...placed.keys()].sort()).toEqual(families)
      for (const index of placed.values()) {
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(of)
      }
    }
  })

  test('is the same whatever order the families arrive in', () => {
    const reversed = assign([...families].reverse(), weigh, 5)
    expect(assign(families, weigh, 5)).toEqual(reversed)
  })

  test('no shard carries more than the lightest plus the heaviest family', () => {
    const placed = assign(families, weigh, 5)
    const loads = new Array(5).fill(0)
    for (const [family, index] of placed) {
      loads[index] += weigh(family)
    }
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(30)
  })

  test('a family weighing nothing still belongs to a shard', () => {
    expect(assign(['empty', 'full'], (one) => (one === 'full' ? 3 : 0), 2).size).toBe(2)
  })
})

describe('the arguments', () => {
  test('none asked for is every family', () => {
    process.argv = ['bun', 'check']
    expect(shard()).toBeUndefined()
    expect(families.every(owner(families, weigh))).toBe(true)
  })

  test('the owners of all shards together are every family once', () => {
    const owned = []
    for (let index = 0; index < 4; index += 1) {
      process.argv = ['bun', 'check', '--shard', String(index), '--of', '4']
      owned.push(...families.filter(owner(families, weigh)))
    }
    expect(owned.sort()).toEqual(families)
  })

  test('a malformed or lone argument is refused rather than read as the whole run', () => {
    for (const given of [
      ['--shard', '1'],
      ['--of', '3'],
      ['--shard', '3', '--of', '3'],
      ['--shard', 'x', '--of', '2'],
    ]) {
      process.argv = ['bun', 'check', ...given]
      expect(() => shard()).toThrow()
    }
  })

  test('a shard is printed counted from 1', () => {
    expect(which({ index: 0, of: 4 })).toBe('shard 1 of 4')
  })
})
