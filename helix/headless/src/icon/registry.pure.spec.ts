import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  registeredIcon,
  registerIconLibrary,
  registerIcons,
  resolveIcon,
  watchIcons,
} from './registry.js'

const glyph = (name: string) => ({ content: `<path id="${name}"/>`, name, viewBox: '0 0 24 24' })

describe('the icon registry', () => {
  test('resolves a glyph registered in a record, under its key', () => {
    registerIcons({ 'spec-tick': glyph('tick') })
    expect(registeredIcon('spec-tick')?.content).toBe('<path id="tick"/>')
  })

  test('and one registered in a list, under its own name', () => {
    registerIcons([glyph('spec-cross')])
    expect(resolveIcon('spec-cross')).toEqual(glyph('spec-cross'))
  })

  test('takes the newer glyph for a name registered again', () => {
    registerIcons([glyph('spec-again')])
    registerIcons({ 'spec-again': glyph('newer') })
    expect(registeredIcon('spec-again')?.name).toBe('newer')
  })

  test('resolves nothing for a name nobody registered', () => {
    expect(resolveIcon('spec-nobody')).toBeUndefined()
    expect(resolveIcon('')).toBeUndefined()
  })

  test('asks a library for a name under its prefix, at once or later', async () => {
    registerIconLibrary('spec-now', (name) => glyph(name))
    registerIconLibrary('spec-later', (name) => Promise.resolve(glyph(name)))
    expect(resolveIcon('spec-now:camera')).toEqual(glyph('camera'))
    expect(await resolveIcon('spec-later:camera')).toEqual(glyph('camera'))
    expect(resolveIcon('spec-unknown:camera')).toBeUndefined()
  })

  test('prefers a registered glyph over its library', () => {
    registerIconLibrary('spec-lib', () => glyph('from-library'))
    registerIcons({ 'spec-lib:star': glyph('registered') })
    expect((resolveIcon('spec-lib:star') as { name: string }).name).toBe('registered')
  })

  test('asks a library once for each written name, and afresh when it is registered again', async () => {
    let asked = 0
    registerIconLibrary('spec-once', (name) => {
      asked += 1
      return Promise.resolve(glyph(name))
    })
    const first = resolveIcon('spec-once:camera')
    expect(resolveIcon('spec-once:camera')).toBe(first)
    await first
    expect(resolveIcon('spec-once:camera')).toEqual(glyph('camera'))
    expect(asked).toBe(1)
    registerIconLibrary('spec-once', (name) => glyph(`again-${name}`))
    expect((resolveIcon('spec-once:camera') as { name: string }).name).toBe('again-camera')
  })

  test('reads a library that throws or rejects as no answer', async () => {
    registerIconLibrary('spec-throws', () => {
      throw new Error('offline')
    })
    registerIconLibrary('spec-rejects', () => Promise.reject(new Error('offline')))
    expect(resolveIcon('spec-throws:camera')).toBeUndefined()
    expect(await resolveIcon('spec-rejects:camera')).toBeUndefined()
  })

  test('tells a watcher of every registration until it stops watching', () => {
    let heard = 0
    const stop = watchIcons(() => {
      heard += 1
    })
    registerIcons([glyph('spec-watched')])
    registerIconLibrary('spec-watched', () => undefined)
    stop()
    registerIcons([glyph('spec-unwatched')])
    expect(heard).toBe(2)
  })
})

/* The family's entry registers the set; the element's own does not, which is
   the whole point of having two. */
describe('the entries', () => {
  const read = (path: string) => readFileSync(join(import.meta.dir, path), 'utf8')
  const carriesTheSet = (source: string) =>
    /import \{[^}]*\bicons\b[^}]*\} from '@fusion\.dev\/helix-icons'/.test(source) ||
    source.includes("'./set.js'") ||
    source.includes("'../set.js'")

  test('the family entry registers the whole set', () => {
    expect(read('index.ts')).toContain("import './set.js'")
    expect(carriesTheSet(read('set.ts'))).toBe(true)
  })

  test('the element and its own entry carry no glyph', () => {
    for (const path of ['root/index.ts', 'root/icon-root.ts', 'registry.ts']) {
      expect(carriesTheSet(read(path))).toBe(false)
    }
  })
})
