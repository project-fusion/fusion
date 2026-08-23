import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contentPath, type DocPage, findPage, navigation, pages, sections } from './registry.js'
import { findSection } from './sections.js'

const ROOT = join(import.meta.dir, '..')

describe('registry', () => {
  test('slugs are unique', () => {
    const slugs = pages.map((page) => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test('pages are findable by slug', () => {
    const slug = pages[0]?.slug ?? ''
    expect(findPage(slug)?.slug).toBe(slug)
    expect(findPage('nope')).toBeUndefined()
  })

  test('every page is in a declared section', () => {
    expect(pages.filter((page) => findSection(page.section) === undefined)).toEqual([])
  })
})

// The ordering rule is the one thing here a reader cannot see by looking at a
// page: a section is alphabetical unless it says it is a path, and a pinned
// entry sits above the alphabet rather than inside it. Every one of these is a
// silent failure, a sidebar that renders in a plausible wrong order.
describe('navigation orders each section', () => {
  const titles = (entries: DocPage[]) => entries.map((entry) => entry.title.toLowerCase())

  test('a path renders in its declared order', () => {
    for (const section of navigation().filter((entry) => entry.path)) {
      const orders = section.pages.map((page) => page.order ?? 0)
      expect(
        [...orders].sort((a, b) => a - b),
        `${section.title} is unordered`,
      ).toEqual(orders)
    }
  })

  test('everything else is alphabetical below its pinned entry', () => {
    for (const section of navigation().filter((entry) => !entry.path)) {
      const pinned = section.pages.filter((page) => page.pinned)
      expect(pinned.length, `${section.title} has more than one entry page`).toBeLessThan(2)
      expect(section.pages.slice(0, pinned.length)).toEqual(pinned)

      const rest = titles(section.pages.slice(pinned.length))
      expect([...rest].sort(), `${section.title} is not alphabetical`).toEqual(rest)
    }
  })

  test('children are alphabetical, then the catch-alls, and every parent resolves', () => {
    for (const section of navigation()) {
      for (const page of section.pages) {
        /* Two alphabetical runs rather than one, because a page answering "none
           of the above" reads as nonsense in the middle of the alphabet it is
           the alternative to. Each run is checked on its own, so this still
           fails if either is shuffled. */
        const named = titles(page.children.filter((child) => !child.trailing))
        const trailing = titles(page.children.filter((child) => child.trailing))
        expect([...named].sort(), `${page.slug} orders its children`).toEqual(named)
        expect([...trailing].sort(), `${page.slug} orders its catch-alls`).toEqual(trailing)
        expect(titles(page.children), `${page.slug} sinks its catch-alls`).toEqual([
          ...named,
          ...trailing,
        ])
        for (const child of page.children) {
          expect(child.parent).toBe(page.slug)
        }
      }
    }
  })

  test('no section renders empty, because a heading is an existence claim', () => {
    for (const section of navigation()) {
      expect(section.pages.length, `${section.title} has no pages`).toBeGreaterThan(0)
    }
    expect(navigation().length).toBe(sections.length)
  })

  test('every page reaches the navigation exactly once', () => {
    const reached = navigation().flatMap((section) =>
      section.pages.flatMap((page) => [page.slug, ...page.children.map((child) => child.slug)]),
    )
    expect(reached.sort()).toEqual(pages.map((page) => page.slug).sort())
  })
})

// The registry and the content directory drift apart silently otherwise: a page
// listed with no MDX renders a 404, and an MDX file with no entry is
// unreachable. Neither shows up until someone clicks.
describe('registry matches content on disk', () => {
  const files = readdirSync(join(ROOT, 'content'))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .sort()

  test('every registered page has an MDX file', () => {
    expect(pages.map((page) => page.slug).filter((slug) => !files.includes(slug))).toEqual([])
  })

  test('every MDX file is registered', () => {
    const slugs = pages.map((page) => page.slug)
    expect(files.filter((file) => !slugs.includes(file))).toEqual([])
  })

  test('contentPath resolves to a real file', () => {
    for (const page of pages) {
      expect(contentPath(page)).toBe(`content/${page.slug}.mdx`)
      expect(files).toContain(page.slug)
    }
  })

  // The generated module is only worth having if it says what the frontmatter
  // says. `bun run check:docs` is what enforces that in CI; this is what
  // catches it in the two seconds after somebody edits a title by hand.
  test('title and description come from the frontmatter', () => {
    for (const page of pages) {
      const source = readFileSync(join(ROOT, contentPath(page)), 'utf8')
      expect(source, `${page.slug} has no frontmatter`).toStartWith('---\n')
      expect(source).toContain(`\ntitle: ${page.title}\n`)
      expect(source).toContain(`\ndescription: ${page.description}\n`)
    }
  })
})
