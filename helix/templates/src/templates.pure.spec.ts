import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findTemplate, PROJECT_NAME, templates } from './index.js'

/* The payloads are data rather than code, so nothing type-checks them and
   nothing imports them. This is what holds the register to the directories. */
const ROOT = join(import.meta.dirname, '..')

/** Where a template's files live, which is `template-<id>` beside the manifest. */
const directoryOf = (id: string) => join(ROOT, `template-${id}`)

const walk = (dir: string, base = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const here = base === '' ? entry.name : `${base}/${entry.name}`
    return entry.isDirectory() ? walk(join(dir, entry.name), here) : [here]
  })

describe('the register and the directories', () => {
  test('every registered template has a directory', () => {
    for (const one of templates) {
      expect(statSync(directoryOf(one.id)).isDirectory()).toBe(true)
    }
  })

  /* The other direction, which is the one that rots: a template added on disk
     and not registered ships in the package and is offered by nobody. */
  test('every directory is registered', () => {
    const onDisk = readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('template-'))
      .map((entry) => entry.name.slice('template-'.length))
    expect(onDisk.toSorted()).toEqual(templates.map((one) => one.id).toSorted())
  })

  test('ids are unique, since a caller passes one', () => {
    expect(new Set(templates.map((one) => one.id)).size).toBe(templates.length)
  })

  test('findTemplate answers for every id and refuses an unknown one', () => {
    for (const one of templates) {
      expect(findTemplate(one.id)).toBe(one)
    }
    expect(findTemplate('nothing-like-this')).toBeUndefined()
  })
})

describe('the project name placeholder', () => {
  /**
   * **Named files are asserted in both directions, and the second is the point.**
   *
   * A `named` list that misses a file is a scaffolded project with
   * `__PROJECT_NAME__` still in it, which a reader sees. A `named` list that
   * includes a file no longer carrying the placeholder is the quieter fault: a
   * scaffolder that rewrites by name notices nothing, and the entry stays until
   * somebody wonders what it was for.
   */
  for (const one of templates) {
    test(`${one.id} carries the placeholder in exactly the files it names`, () => {
      const carrying = walk(directoryOf(one.id)).filter((file) =>
        readFileSync(join(directoryOf(one.id), file), 'utf8').includes(PROJECT_NAME),
      )
      expect(carrying.toSorted()).toEqual([...one.named].toSorted())
    })
  }

  test('every template names its own manifest, which is what carries the name npm reads', () => {
    for (const one of templates) {
      expect(one.named).toContain('package.json')
    }
  })
})
