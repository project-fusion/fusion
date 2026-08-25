import { describe, expect, test } from 'bun:test'
import type { HelixManifest } from '@helix-io/cem'
import { catalog, type ExampleSource, findInCatalog } from './catalog.js'

const manifest: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          helix: {
            aliases: ['pager'],
            category: 'navigation',
            examples: [{ description: 'Counts written short.', slug: 'compact' }],
            part: 'root',
          },
          members: [
            { kind: 'field', name: 'page', type: { text: "'first' | 'last' | undefined" } },
            { kind: 'field', name: 'total', readonly: true },
            { kind: 'field', name: 'formAssociated', static: true },
            { kind: 'field', name: 'hidden', privacy: 'private' },
            {
              kind: 'method',
              name: 'goTo',
              parameters: [{ name: 'page', type: { text: 'number' } }],
              return: { type: { text: 'boolean' } },
            },
            { kind: 'method', name: 'formResetCallback' },
          ],
          name: 'HelixPagination',
          summary: 'Moves between pages.',
          tagName: 'helix-pagination',
        },
      ],
      path: 'src/pagination/root/pagination-root.ts',
    },
    {
      declarations: [{ name: 'HelixHeadlessPagination', tagName: 'helix-headless-pagination' }],
      path: 'src/pagination/root/headless-pagination-root.ts',
    },
    {
      declarations: [{ name: 'HelixQrCode', tagName: 'helix-qr-code' }],
      path: 'src/qr-code/r/a.ts',
    },
  ],
}

const examples: ExampleSource[] = [
  { css: '', family: 'pagination', html: '<helix-pagination></helix-pagination>', slug: 'compact' },
  { css: '', family: 'pagination', html: '<helix-pagination></helix-pagination>', slug: 'window' },
  { css: '', family: 'pagination', html: '<helix-pagination></helix-pagination>', slug: 'preview' },
  {
    css: '',
    family: 'pagination',
    html: '<helix-pagination></helix-pagination>',
    slug: 'compact-counts',
  },
  {
    css: 'a{}',
    family: 'pagination',
    html: '<helix-headless-pagination></helix-headless-pagination>',
    slug: 'headless',
  },
  { css: '', family: 'qr-code', html: '<helix-qr-code></helix-qr-code>', slug: 'preview' },
]

describe('catalog', () => {
  const families = catalog([manifest], examples)
  const pagination = findInCatalog(families, 'pagination')

  test('families are alphabetical by label, with initialisms intact', () => {
    expect(families.map((family) => family.label)).toEqual(['Pagination', 'QR Code'])
  })

  test('a family reads its metadata from its styled root', () => {
    expect(pagination?.aliases).toEqual(['pager'])
    expect(pagination?.category).toBe('navigation')
    expect(pagination?.summary).toBe('Moves between pages.')
  })

  // Alphabetical order would put the headless tier on top, which is the one
  // most readers never reach for.
  test('elements are styled first, then headless', () => {
    expect(pagination?.elements.map((element) => element.tagName)).toEqual([
      'helix-pagination',
      'helix-headless-pagination',
    ])
    expect(pagination?.elements.map((element) => element.tier)).toEqual(['styled', 'headless'])
  })

  test('a headless element loses the prefix in its label', () => {
    expect(pagination?.elements[1]?.label).toBe('Pagination')
  })

  test('drops statics, privates, and the callbacks the platform calls', () => {
    const root = pagination?.elements[0]
    expect(root?.properties.map((property) => property.name)).toEqual(['page', 'total'])
    expect(root?.methods.map((method) => method.name)).toEqual(['goTo'])
  })

  // `'primary' | 'neutral' | undefined` is how an optional property is
  // expressed, not a value anyone sets.
  test('a union loses its undefined', () => {
    expect(pagination?.elements[0]?.properties[0]?.type).toBe("'first' | 'last'")
  })

  test('a getter is marked, so a reader is not invited to set it', () => {
    expect(pagination?.elements[0]?.properties[1]?.readonly).toBe(true)
  })

  // `(next: string) => boolean` says what to pass; `boolean` does not.
  test('a method is typed by the signature a caller writes', () => {
    expect(pagination?.elements[0]?.methods[0]?.type).toBe('(page: number) => boolean')
  })
})

describe('examples', () => {
  const pagination = findInCatalog(catalog([manifest], examples), 'pagination')

  // Sorted by slug, not by filename. Comparing `compact-counts.html` against
  // `compact.html` puts the longer name first, because `-` precedes `.`, which
  // is a list ordered by an extension no reader sees.
  test('the canonical example leads, then alphabetical by slug', () => {
    expect(pagination?.examples.map((example) => example.slug)).toEqual([
      'preview',
      'headless',
      'compact',
      'compact-counts',
      'window',
    ])
  })

  // The canonical example is the component's headline, not a named variant,
  // and a headless example takes the name of the one it mirrors so the two tiers
  // show the same list.
  test('the canonical example and its headless twin are both Preview', () => {
    expect(pagination?.examples[0]?.label).toBe('Preview')
    expect(pagination?.examples[1]?.label).toBe('Preview')
    expect(pagination?.examples[2]?.label).toBe('Compact')
  })

  // Off the markup rather than off the filename, the same test `check:tokens`
  // uses to know a headless example's stylesheet may write raw values.
  test('the tier comes from what the example renders', () => {
    expect(pagination?.examples.map((example) => example.tier)).toEqual([
      'styled',
      'headless',
      'styled',
      'styled',
      'styled',
    ])
  })

  test('the description comes from the manifest, keyed by slug', () => {
    expect(pagination?.examples[2]?.description).toBe('Counts written short.')
    expect(pagination?.examples[0]?.description).toBe('')
  })

  test('an example belongs only to its own family', () => {
    expect(findInCatalog(catalog([manifest], examples), 'qr-code')?.examples).toHaveLength(1)
  })
})
