import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (path: string): string => readFileSync(join(import.meta.dir, path), 'utf8')

/** Each rule of a sheet by its selector, its body without comments or spacing. */
const rulesOf = (sheet: string): Map<string, string> => {
  const bare = sheet.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = new Map<string, string>()
  for (const match of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of (match[1] ?? '').split(',')) {
      const name = selector.trim()
      if (name !== '') {
        rules.set(
          `${name} ${rules.has(name) ? rules.size : ''}`,
          (match[2] ?? '').replace(/\s+/g, ' ').trim(),
        )
      }
    }
  }
  return rules
}

describe('the recipes a shadow root adopts', () => {
  const base = [...rulesOf(read('../../../styles/src/base.css')).entries()]
  const recipes = [...rulesOf(read('./recipes.css')).entries()]

  test('hold each rule to the base layer, so the two cannot drift', () => {
    expect(recipes.length).toBeGreaterThan(0)
    for (const [key, body] of recipes) {
      const selector = key.split(' ')[0]
      const same = base.filter(([other]) => other.split(' ')[0] === selector)
      expect(same.length, selector).toBeGreaterThan(0)
      expect(same.map(([, one]) => one)).toContain(body)
    }
  })

  test('cover the link and density recipes', () => {
    const selectors = new Set(recipes.map(([key]) => key.split(' ')[0]))
    for (const selector of [
      '[data-link]',
      '[data-link="quiet"]',
      '[data-link-underline="hover"]',
      '[data-density="sm"]',
      '[data-density="lg"]',
    ]) {
      expect(selectors.has(selector), selector).toBe(true)
    }
  })
})
