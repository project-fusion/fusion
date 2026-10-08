import { describe, expect, test } from 'bun:test'
import { contextBudget, type Holder, pageBudget } from './context-budget.js'

/** A drawing that records what the budget asked of it. */
const drawing = (name: string, log: string[]): Holder => ({
  release: () => log.push(`release ${name}`),
  restore: () => log.push(`restore ${name}`),
})

describe('the context budget', () => {
  test('under the cap, nothing gives its context back, on screen or off', () => {
    const log: string[] = []
    const budget = contextBudget(2)
    const [a, b] = [drawing('a', log), drawing('b', log)]
    budget.join(a)
    budget.join(b)
    budget.far(a, 1)
    expect(log).toEqual([])
    expect(budget.holding).toBe(2)
  })

  test('past the cap, the drawing off screen longest gives its context back first', () => {
    const log: string[] = []
    const budget = contextBudget(2)
    const [a, b, c] = [drawing('a', log), drawing('b', log), drawing('c', log)]
    budget.join(a)
    budget.join(b)
    budget.far(b, 1)
    budget.far(a, 2)
    budget.join(c)
    expect(log).toEqual(['release b'])
    expect(budget.holding).toBe(2)
  })

  test('a drawing coming near takes its context again, and another far one gives way', () => {
    const log: string[] = []
    const budget = contextBudget(2)
    const [a, b, c] = [drawing('a', log), drawing('b', log), drawing('c', log)]
    for (const one of [a, b, c]) {
      budget.join(one)
    }
    budget.far(a, 1)
    budget.far(b, 2)
    log.length = 0
    budget.near(a)
    expect(log).toEqual(['restore a', 'release b'])
  })

  test('drawings on screen keep their contexts, however many there are', () => {
    const log: string[] = []
    const budget = contextBudget(1)
    const [a, b] = [drawing('a', log), drawing('b', log)]
    budget.join(a)
    budget.join(b)
    budget.near(a)
    budget.near(b)
    expect(log).toEqual([])
    expect(budget.holding).toBe(2)
  })

  test('a drawing that ended is no longer counted', () => {
    const log: string[] = []
    const budget = contextBudget(1)
    const [a, b] = [drawing('a', log), drawing('b', log)]
    budget.join(a)
    budget.leave(a)
    budget.join(b)
    budget.far(b, 1)
    expect(log).toEqual([])
    expect(budget.holding).toBe(1)
  })
  test('every copy on a page shares one budget', () => {
    expect(pageBudget()).toBe(pageBudget())
  })
})
