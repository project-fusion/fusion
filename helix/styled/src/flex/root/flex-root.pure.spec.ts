import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/* The class description is what the reference page, the manifest and every
   framework's typings print, so a count in it goes stale the day a pattern is
   added. `switch` was the fourth, under a sentence that said three. */
const source = readFileSync(join(import.meta.dir, 'flex-root.ts'), 'utf8')
const description = source.slice(source.indexOf('@summary'), source.indexOf('@since'))
const layouts = [...(/layout\?: ([^\n]+)/.exec(source)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map(
  (match) => match[1],
)

describe('the flex description', () => {
  test('lists every layout as a bullet', () => {
    expect(layouts.length).toBeGreaterThan(0)
    const listed = layouts.filter((layout) =>
      new RegExp(`^ \\* - (?:\`[a-z-]+\` and )?\`${layout}\`|and \`${layout}\`:`, 'm').test(
        description,
      ),
    )
    expect(listed).toEqual(layouts)
  })

  test('counts none of them, so a new one cannot make it wrong', () => {
    expect(description).not.toMatch(/one of (?:two|three|four|five|six|\d+) /)
  })
})
