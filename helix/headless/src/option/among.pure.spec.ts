import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Which modules an entry reaches by its static imports, read from source.
 *
 * **A container does not register another family's children.** An option is
 * the Option family's, and a page writing one imports
 * `@fusion.dev/helix-headless/option` itself. A container that reached
 * `option-root.ts` registered the option for every page that imported it,
 * which hid the import a page needs until it imported the container alone.
 * Read off the import graph, because the registry a spec process shares is
 * already holding an option some other spec defined.
 */
const helix = fileURLToPath(new URL('../../..', import.meta.url))

const PACKAGES: Record<string, string> = {
  '@fusion.dev/helix': 'styled',
  '@fusion.dev/helix-headless': 'headless',
}

/** The source file an import names, or undefined for one outside the two tiers. */
const target = (from: string, specifier: string): string | undefined => {
  if (specifier.startsWith('.')) {
    return resolve(dirname(from), specifier).replace(/\.js$/, '.ts')
  }
  const match = /^(@fusion\.dev\/helix(?:-headless)?)\/([a-z-]+(?:\/[a-z-]+)?)$/.exec(specifier)
  const tier = match ? PACKAGES[match[1] as string] : undefined
  return tier && match ? join(helix, tier, 'src', match[2] as string, 'index.ts') : undefined
}

/** Every module `entry` reaches by a static import, `import()` left out. */
const reached = (entry: string): Set<string> => {
  const seen = new Set<string>()
  const visit = (file: string): void => {
    if (seen.has(file) || !existsSync(file)) {
      return
    }
    seen.add(file)
    const text = readFileSync(file, 'utf8')
    for (const [, kind, specifier] of text.matchAll(
      /^(import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm,
    )) {
      if (kind && specifier) {
        const next = target(file, specifier)
        if (next) {
          visit(next)
        }
      }
    }
  }
  visit(entry)
  return seen
}

const OPTION = join(helix, 'headless/src/option/root/option-root.ts')
const STYLED_OPTION = join(helix, 'styled/src/option/root/option-root.ts')
const COLUMN = join(helix, 'headless/src/table/column/table-column.ts')
const STYLED_COLUMN = join(helix, 'styled/src/table/column/table-column.ts')

describe('the containers of another family’s children', () => {
  for (const tier of ['headless', 'styled']) {
    for (const family of ['combobox', 'filter-input', 'listbox', 'select']) {
      test(`${tier} ${family} registers no option`, () => {
        const graph = reached(join(helix, tier, 'src', family, 'index.ts'))
        expect(graph.size).toBeGreaterThan(1)
        expect([graph.has(OPTION), graph.has(STYLED_OPTION)]).toEqual([false, false])
      })
    }
    test(`${tier} data table registers no column`, () => {
      const graph = reached(join(helix, tier, 'src', 'data-table', 'index.ts'))
      expect([graph.has(COLUMN), graph.has(STYLED_COLUMN)]).toEqual([false, false])
    })
  }

  /* Command draws the controls on screen as options under `controls`. */
  test('a family that draws options in its own shadow root still registers them', () => {
    for (const family of ['command', 'time-picker', 'pagination']) {
      expect(reached(join(helix, 'headless/src', family, 'index.ts')).has(OPTION)).toBe(true)
    }
  })
})
