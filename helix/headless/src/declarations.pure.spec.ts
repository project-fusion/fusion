import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/* What an element sends and renders is declared on its class. The manifest,
   the reference pages and the framework typings are all read from the class
   JSDoc, so an event or a slot that is only in the code is missing from every
   one of them, with the element working. */

/** Every module of this tier's source, as a path relative to it. */
const modules = (): string[] =>
  readdirSync(import.meta.dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => !entry.name.includes('.spec.') && !entry.name.endsWith('.css.ts'))
    .map((entry) => relative(import.meta.dir, join(entry.parentPath, entry.name)))
    .filter((path) => !path.startsWith('.') && !path.includes('/.examples/'))
    .sort()

const read = (path: string): string => readFileSync(join(import.meta.dir, path), 'utf8')

describe('the toggle event', () => {
  /** The modules whose element opens and closes through `MixinControllerOpen`. */
  const opening = (): string[] =>
    modules().filter((path) => read(path).includes('MixinControllerOpen('))

  /* The mixin sends a real `ToggleEvent` where the platform has one, and the
     braced type is what the framework typings read: a family that declares
     `{Event}` types `onToggle` without `newState`, and one that declares
     nothing leaves the event off its reference page. */
  test('is declared as a ToggleEvent by every element that opens', () => {
    const undeclared = opening().filter(
      (path) => !read(path).includes('@event {ToggleEvent} toggle - '),
    )
    expect(undeclared).toEqual([])
  })

  test('finds the elements that open', () => {
    expect(opening()).toContain('dialog/root/dialog-root.ts')
  })
})

describe('the default slot', () => {
  /** The modules whose template renders a `<slot>` with no name. */
  const rendering = (): string[] =>
    modules().filter((path) =>
      /* A backtick before the tag is a comment naming the element, not a
         template rendering one. */
      [...read(path).matchAll(/(?:^|[^`])<slot(\s[^>]*)?>/gm)].some(
        (match) => !/\bname=/.test(match[1] ?? ''),
      ),
    )

  test('is declared by every element that renders one', () => {
    const undeclared = rendering().filter((path) => !read(path).includes(' * @slot - '))
    expect(undeclared).toEqual([])
  })

  test('finds the elements that render one', () => {
    expect(rendering()).toContain('card/root/card-root.ts')
  })
})
