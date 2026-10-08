import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/* `core` ships the rule for a mark only into the shadow root of an element that
   names it in `markRules`, so a family that writes `data-mirror` and leaves
   `MIRROR_RULE` out draws its carets the wrong way round on a right-to-left
   page, with nothing failing. This holds every module that writes a mark, or
   starts the controller that writes one, to naming exactly the rules it needs,
   in the order `mark-rules.ts` declares them. */

/** Every module of this tier's source, as a path relative to it. */
const modules = (): string[] =>
  readdirSync(import.meta.dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => !entry.name.includes('.spec.') && !entry.name.endsWith('.css.ts'))
    .map((entry) => relative(import.meta.dir, join(entry.parentPath, entry.name)))
    .filter((path) => !path.startsWith('.') && !path.includes('/.examples/'))
    .sort()

/** A module's code, its comments taken out: a comment naming a mark writes none. */
const code = (path: string): string =>
  readFileSync(join(import.meta.dir, path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/** Each rule, in declaration order, with what in a module means it is needed. */
const RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ['SCROLLER_RULE', /data-scroller/],
  ['VIRTUAL_RULE', /new (?:OptionWindow|Virtualize)Controller\b/],
  ['SPOKEN_RULE', /data-spoken/],
  ['MIRROR_RULE', /data-mirror/],
]

/** The rules a module's code calls for, in declaration order. */
const needed = (text: string): string[] =>
  RULES.filter(([, writes]) => writes.test(text)).map(([name]) => name)

/** The rules a module names in `markRules`, as written. */
const named = (text: string): string[] =>
  text
    .match(/static override markRules = \[([^\]]*)\]/)?.[1]
    ?.split(',')
    .map((name) => name.trim())
    .filter(Boolean) ?? []

describe('the rules for the marks an element writes', () => {
  test('are named by every module that writes a mark, and only those', () => {
    const wrong = modules()
      .map((path) => {
        const text = code(path)
        return { named: named(text), needed: needed(text), path }
      })
      .filter((one) => one.named.join() !== one.needed.join())
    expect(wrong).toEqual([])
  })

  test('finds the modules that write each mark', () => {
    const writers = (rule: string): string[] =>
      modules().filter((path) => needed(code(path)).includes(rule))
    expect(writers('SCROLLER_RULE')).toContain('scroll-area/root/scroll-area-root.ts')
    expect(writers('VIRTUAL_RULE')).toContain('virtual-list/root/virtual-list-root.ts')
    expect(writers('SPOKEN_RULE')).toContain('kbd/root/kbd-root.ts')
    expect(writers('MIRROR_RULE')).toContain('icon/root/icon-root.ts')
  })
})
