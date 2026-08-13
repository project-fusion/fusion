import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  contentPath,
  currentVersion,
  findPage,
  findVersion,
  sections,
  versions,
} from './registry.js'

const ROOT = join(import.meta.dir, '..')

describe('registry', () => {
  test('exactly one version is current', () => {
    expect(versions.filter((v) => v.status === 'current')).toHaveLength(1)
    expect(currentVersion.status).toBe('current')
  })

  test('slugs are unique within a version', () => {
    for (const version of versions) {
      const slugs = version.pages.map((p) => p.slug)
      expect(new Set(slugs).size, `duplicate slug in ${version.label}`).toBe(slugs.length)
    }
  })

  test('versions are findable by version and by label', () => {
    expect(findVersion(currentVersion.version)?.dir).toBe(currentVersion.dir)
    expect(findVersion(currentVersion.label)?.dir).toBe(currentVersion.dir)
    expect(findVersion('does-not-exist')).toBeUndefined()
  })

  test('pages are findable by slug', () => {
    const slug = currentVersion.pages[0]?.slug ?? ''
    expect(findPage(currentVersion, slug)?.slug).toBe(slug)
    expect(findPage(currentVersion, 'nope')).toBeUndefined()
  })

  test('sections order their pages', () => {
    for (const { pages, section } of sections(currentVersion)) {
      const orders = pages.map((p) => p.order)
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
  for (const version of versions) {
    const dir = join(ROOT, 'content', version.dir)
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''))
      .sort()

    test(`${version.label}: every registered page has an MDX file`, () => {
      const missing = version.pages.map((p) => p.slug).filter((slug) => !files.includes(slug))
      expect(missing).toEqual([])
    })

    test(`${version.label}: every MDX file is registered`, () => {
      const slugs = version.pages.map((p) => p.slug)
      expect(files.filter((f) => !slugs.includes(f))).toEqual([])
    })

    test(`${version.label}: contentPath resolves to a real file`, () => {
      for (const page of version.pages) {
        const relative = contentPath(version, page)
        expect(relative).toBe(`content/${version.dir}/${page.slug}.mdx`)
        expect(files).toContain(page.slug)
      }
    })
  }
})
