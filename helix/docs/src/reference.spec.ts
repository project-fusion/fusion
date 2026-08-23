import { describe, expect, test } from 'bun:test'
import type { HelixManifest } from '@helix-io/cem'
import { place, reference, referenceFamilies } from './reference.js'

/**
 * A manifest small enough to read, carrying one of everything the renderer
 * decides about: an inherited member, a private one, an infrastructural one, a
 * union type with a pipe in it, a multi-paragraph description, and a part that
 * is not the root.
 */
const manifest: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          attributes: [{ fieldName: 'mode', name: 'mode' }],
          cssProperties: [{ description: 'Colour of the seams.', name: '--accordion-border' }],
          description: 'What it is.\n\nAnd the reasoning, which a heading keeps.',
          events: [
            { description: 'Fired on open.', name: 'helix-open', type: { text: 'HelixOpenEvent' } },
          ],
          members: [
            {
              description: 'How many open at once.\n\nA second paragraph, which a cell drops.',
              kind: 'field',
              name: 'mode',
              type: { text: "'single' | 'many'" },
            },
            {
              default: 'false',
              inheritedFrom: { name: 'MixinControllerOpen' },
              kind: 'field',
              name: 'open',
              type: { text: 'boolean' },
            },
            { kind: 'field', name: 'hidden', privacy: 'private' },
            { inheritedFrom: { name: 'HelixElement' }, kind: 'field', name: 'internals' },
            { kind: 'method', name: 'toggleOpen' },
          ],
          name: 'HelixAccordion',
          slots: [{ description: 'The items.', name: '' }],
          summary: 'Groups collapsible sections.',
          superclass: { name: 'HelixBaseAccordion' },
          tagName: 'helix-accordion',
        },
      ],
      path: 'src/accordion/root/accordion-root.ts',
    },
    {
      declarations: [{ name: 'HelixAccordionItem', tagName: 'helix-accordion-item' }],
      path: 'src/accordion/item/accordion-item.ts',
    },
    // A module with nothing tagged, and one outside `src/`, are both skipped.
    { declarations: [{ name: 'notAnElement' }], path: 'src/accordion/util/util.ts' },
    { declarations: [{ name: 'HelixThing', tagName: 'helix-thing' }], path: 'other/thing.ts' },
  ],
}

describe('place', () => {
  // A tag is a string the family prefix can only be guessed out of:
  // `helix-button-group` is one family and `helix-tabs-tab` is part of another.
  test('reads the family and part from the path, not the tag', () => {
    expect(place('src/button-group/root/button-group-root.ts')).toEqual({
      family: 'button-group',
      part: 'root',
    })
    expect(place('other/thing.ts')).toEqual({ family: '', part: '' })
    expect(place(undefined)).toEqual({ family: '', part: '' })
  })
})

describe('referenceFamilies', () => {
  test('groups by family and puts the root first', () => {
    const families = referenceFamilies(manifest)
    expect(families.map((entry) => entry.family)).toEqual(['accordion'])
    expect(families[0]?.parts.map((entry) => entry.part)).toEqual(['root', 'item'])
  })

  test('skips declarations with no tag and modules outside src', () => {
    const parts = referenceFamilies(manifest).flatMap((entry) => entry.parts)
    expect(parts.map((entry) => entry.declaration.tagName)).toEqual([
      'helix-accordion',
      'helix-accordion-item',
    ])
  })
})

describe('reference', () => {
  const rendered = reference(manifest)

  test('carries the summary, the superclass and the whole description', () => {
    expect(rendered).toContain('Groups collapsible sections.')
    expect(rendered).toContain('Extends `HelixBaseAccordion`.')
    expect(rendered).toContain('And the reasoning, which a heading keeps.')
  })

  // A cell holding four paragraphs is a table nobody reads.
  test('a cell is the first paragraph only', () => {
    const row = rendered.split('\n').find((line) => line.startsWith('| `mode`')) ?? ''
    expect(row).toContain('How many open at once.')
    expect(row).not.toContain('A second paragraph')
  })

  // Every component extends `HelixElement`, so its members would appear on all
  // of them and bury the properties a consumer came to read.
  test('drops private members and anything inherited from HelixElement', () => {
    expect(rendered).not.toContain('`internals`')
    expect(rendered).not.toContain('`hidden`')
    expect(rendered).toContain('`open`')
  })

  test('names where an inherited member came from, and its default', () => {
    const row = rendered.split('\n').find((line) => line.startsWith('| `open`')) ?? ''
    expect(row).toContain('`MixinControllerOpen`')
    expect(row).toContain('`false`')
  })

  // An unescaped union ends the column it is in, and the table after it.
  test('escapes a pipe inside a type', () => {
    expect(rendered).toContain("`'single' \\| 'many'`")
  })

  test('a table with no rows is not printed at all', () => {
    expect(rendered).toContain('#### Custom properties')
    expect(rendered).not.toContain('#### Parts')
  })

  test('an unnamed slot reads as the default one', () => {
    expect(rendered).toContain('*(default)*')
  })

  test('the title and lede come from the caller', () => {
    const withLede = reference(manifest, { lede: ['Read me first.', ''], title: 'Elements' })
    expect(withLede).toStartWith('# Elements\n\nRead me first.\n')
  })

  // One title-caser, so the reference and the site agree. They did not: this
  // file had its own, and spelled the family `Qr Code` where the site said
  // `QR Code`.
  test('a heading knows an initialism', () => {
    const initialism: HelixManifest = {
      modules: [
        {
          declarations: [{ name: 'HelixQrCode', tagName: 'helix-qr-code' }],
          path: 'src/qr-code/root/qr-code-root.ts',
        },
      ],
    }
    expect(reference(initialism)).toContain('## QR Code')
  })

  test('renders nothing but a heading for an empty manifest', () => {
    expect(reference({ modules: [] })).toBe('# Component reference\n')
  })
})
