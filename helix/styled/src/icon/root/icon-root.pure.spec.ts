import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Every module of a tier's source, as a path relative to that source. */
const modulesIn = (root: string): string[] =>
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => !entry.name.includes('.spec.') && !entry.name.endsWith('.css.ts'))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .filter((path) => !path.startsWith('.') && !path.includes('/.examples/'))

/** The modules of a tier that register the icon element, the barrel aside. */
const importers = (tier: 'headless' | 'styled'): string[] => {
  const root = join(import.meta.dir, '../../../..', tier, 'src')
  return modulesIn(root)
    .filter((path) => path !== 'index.ts' && !path.startsWith('icon/'))
    .filter((path) => readFileSync(join(root, path), 'utf8').includes("/icon/index.js'"))
    .sort()
}

describe('the icon element', () => {
  /* Every template draws its glyphs inline with `drawIcon`, and the element
     looks a name up in the record of every glyph. A family that registers it
     without drawing it ships the whole set to name none of it. */
  test('is registered only by a family that draws one', () => {
    expect(importers('headless')).toEqual([])
    expect(importers('styled')).toEqual(['speed-dial/root/speed-dial-root.ts'])
  })
})
