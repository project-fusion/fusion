import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Which modules each tier's menu entry reaches by its static imports, read
 * from source.
 *
 * **The filter is `menu/filter`, so a menu that never filters carries none of
 * it.** Read off the import graph, because the registry a spec process shares
 * already holds the filter some other spec imported.
 */
const helix = fileURLToPath(new URL('../../../..', import.meta.url))

/** The source file an import names, or undefined for one outside the two tiers. */
const target = (from: string, specifier: string): string | undefined => {
  if (specifier.startsWith('.')) {
    return resolve(dirname(from), specifier).replace(/\.js$/, '.ts')
  }
  const match = /^@fusion\.dev\/helix(-headless)?\/([a-z-]+(?:\/[a-z-]+)?)$/.exec(specifier)
  return match
    ? join(helix, match[1] ? 'headless' : 'styled', 'src', match[2] as string, 'index.ts')
    : undefined
}

/** Every module `entry` reaches by a static import. */
const reached = (entry: string): Set<string> => {
  const seen = new Set<string>()
  const visit = (file: string): void => {
    if (seen.has(file) || !existsSync(file)) {
      return
    }
    seen.add(file)
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(
      /^(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm,
    )) {
      const next = specifier ? target(file, specifier) : undefined
      if (next) {
        visit(next)
      }
    }
  }
  visit(entry)
  return seen
}

const FILTER = join(helix, 'headless/src/menu/filter/menu-filter.ts')

describe('the menu filter, an entry of its own', () => {
  for (const tier of ['headless', 'styled']) {
    test(`${tier} menu reaches none of it`, () => {
      const graph = reached(join(helix, tier, 'src/menu/index.ts'))
      expect(graph.size).toBeGreaterThan(1)
      expect(graph.has(FILTER)).toBe(false)
    })

    test(`${tier} menu/filter reaches it, and the menu`, () => {
      const graph = reached(join(helix, tier, 'src/menu/filter/index.ts'))
      expect(graph.has(FILTER)).toBe(true)
      expect(graph.has(join(helix, tier, 'src/menu/root/menu-root.ts'))).toBe(true)
    })
  }

  test('the styled menu carries none of the field’s sheet', () => {
    const css = readFileSync(join(helix, 'styled/src/menu/root/menu-root.generated.css'), 'utf8')
    expect(css).not.toContain('search-field')
  })
})
