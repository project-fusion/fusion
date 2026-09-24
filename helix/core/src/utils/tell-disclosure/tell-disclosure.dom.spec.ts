import { afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { tellDisclosure } from './tell-disclosure.js'

/**
 * Telling a slotted trigger what it opens, or saying why it cannot be told.
 */
beforeAll(() => {
  registerDom()
})

const warn = spyOn(console, 'warn').mockImplementation(() => undefined)

afterEach(() => {
  warn.mockClear()
})

describe('tellDisclosure', () => {
  test('a custom element is given the state as a property, and its markup is left alone', () => {
    const trigger = document.createElement('helix-button') as HTMLElement & { expanded?: boolean }
    tellDisclosure(trigger, true)
    expect(trigger.expanded).toBe(true)
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  test('a plain button is warned about once, and not written to', () => {
    const trigger = document.createElement('button')
    tellDisclosure(trigger, true)
    tellDisclosure(trigger, false)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
  })

  test('a plain button already carrying aria-expanded is not warned about', () => {
    // The warning's own advice, taken: the consumer mirrors the state themselves.
    const trigger = document.createElement('button')
    trigger.setAttribute('aria-expanded', 'false')
    tellDisclosure(trigger, true)
    expect(warn).not.toHaveBeenCalled()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
