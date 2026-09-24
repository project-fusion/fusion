import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { tellDisclosure } from './tell-disclosure.js'

/**
 * Telling a slotted trigger what it opens, or saying why it cannot be told.
 */
beforeAll(() => {
  registerDom()
})

/**
 * Runs `body` with `console.warn` captured, and puts it back.
 *
 * One process runs every DOM spec, so a shadowed global answers stale to every
 * file after this one. The `finally` is what the restore has to be inside.
 */
const warnings = (body: () => void): string[] => {
  const said: string[] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    said.push(args.join(' '))
  }
  try {
    body()
  } finally {
    console.warn = original
  }
  return said
}

describe('tellDisclosure', () => {
  test('a custom element is given the state as a property, and its markup is left alone', () => {
    const trigger = document.createElement('helix-button') as HTMLElement & { expanded?: boolean }
    const said = warnings(() => tellDisclosure(trigger, true))
    expect(trigger.expanded).toBe(true)
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
    expect(said).toHaveLength(0)
  })

  test('a plain button is warned about once, and not written to', () => {
    const trigger = document.createElement('button')
    const said = warnings(() => {
      tellDisclosure(trigger, true)
      tellDisclosure(trigger, false)
    })
    expect(said).toHaveLength(1)
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
  })

  test('a plain button already carrying aria-expanded is not warned about', () => {
    // The warning's own advice, taken: the consumer mirrors the state themselves.
    const trigger = document.createElement('button')
    trigger.setAttribute('aria-expanded', 'false')
    const said = warnings(() => tellDisclosure(trigger, true))
    expect(said).toHaveLength(0)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
