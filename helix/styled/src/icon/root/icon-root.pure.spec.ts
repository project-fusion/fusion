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
     without drawing it ships the whole set to name none of it. Speed Dial
     was the one that did, and it asks the page to import the icon now. */
  test('is registered by no family', () => {
    expect(importers('headless')).toEqual([])
    expect(importers('styled')).toEqual([])
  })
})

/* The styled element extends the headless one from its lean entry, so the
   styled `icon/root` carries no glyph; the styled family entry re-exports the
   headless family entry, which registers the set as it always did. */
describe('the styled entries', () => {
  const read = (path: string) => readFileSync(join(import.meta.dir, path), 'utf8')

  test('the family entry brings the whole set', () => {
    expect(read('../index.ts')).toContain("from '@fusion.dev/helix-headless/icon'")
  })

  test('the element and its own entry bring none', () => {
    expect(read('icon-root.ts')).toContain("from '@fusion.dev/helix-headless/icon/root'")
    expect(read('index.ts')).toContain("from '@fusion.dev/helix-headless/icon/root'")
    expect(read('index.ts')).not.toContain("from '@fusion.dev/helix-headless/icon'")
  })
})
