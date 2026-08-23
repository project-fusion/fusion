import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

/**
 * A group turning its members off, and giving them back what they had.
 *
 * **The remembering is the whole of it.** Writing `disabled = false` on release
 * would enable a member the consumer had disabled themselves, so the first time
 * a group disables one it records what that member already was, and hands that
 * back rather than a guess. A group that was never disabled writes to its
 * members at all.
 */
type Item = HTMLElement & { disabled: boolean }

let inheritDisabled: (disabled: boolean, items: Item[]) => void
let forgetDisabled: (item: Element) => void

beforeAll(async () => {
  registerDom()
  const mod = await import('./inherit-disabled.js')
  inheritDisabled = mod.inheritDisabled as typeof inheritDisabled
  forgetDisabled = mod.forgetDisabled
})

const items = (...disabled: boolean[]): Item[] =>
  disabled.map((state) => {
    const el = document.createElement('div') as unknown as Item
    el.disabled = state
    return el
  })

const states = (all: Item[]): boolean[] => all.map((one) => one.disabled)

describe('a group that is disabled', () => {
  test('turns every member off', () => {
    const all = items(false, false)
    inheritDisabled(true, all)
    expect(states(all)).toEqual([true, true])
  })

  test('and turning it back on returns each member to what it was', () => {
    const all = items(false, true)
    inheritDisabled(true, all)
    expect(states(all)).toEqual([true, true])
    inheritDisabled(false, all)
    expect(states(all)).toEqual([false, true])
  })

  /* The fault this prevents: releasing by writing `false` would enable a member
     the consumer had disabled on purpose, and the group would have overruled
     them without either of them knowing. */
  test('so a member the consumer disabled stays disabled', () => {
    const [one] = items(true)
    inheritDisabled(true, [one])
    inheritDisabled(false, [one])
    expect(one.disabled).toBe(true)
  })

  test('and disabling twice does not overwrite what was remembered', () => {
    const [one] = items(true)
    inheritDisabled(true, [one])
    inheritDisabled(true, [one])
    inheritDisabled(false, [one])
    expect(one.disabled).toBe(true)
  })
})

describe('a group that was never disabled', () => {
  test('writes nothing to its members', () => {
    const all = items(false, true)
    inheritDisabled(false, all)
    expect(states(all)).toEqual([false, true])
  })
})

describe('a member that leaves', () => {
  /* Held in a `WeakMap`, so a member that is dropped is collected; forgetting is
     for the member that leaves a group and stays on the page. */
  test('is forgotten, so rejoining starts from what it is now', () => {
    const [one] = items(false)
    inheritDisabled(true, [one])
    forgetDisabled(one)
    one.disabled = true
    inheritDisabled(false, [one])
    expect(one.disabled).toBe(true)
  })
})
