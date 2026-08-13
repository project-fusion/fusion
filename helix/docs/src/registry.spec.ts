import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { contentPath, findPage, pages, sections } from './registry.js'

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

  test('sections order their pages', () => {
    for (const { pages: grouped, section } of sections()) {
      const orders = grouped.map((page) => page.order)
      expect(
        [...orders].sort((a, b) => a - b),
        `${section} is unordered`,
      ).toEqual(orders)
    }
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
})
