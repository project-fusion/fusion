import { describe, expect, test } from 'bun:test'
import { catalog, type ExampleSource, findInCatalog, publishedBy, rendersOf } from './catalog.js'
import type { HelixManifest } from './types.js'

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
  {
    css: '',
    family: 'pagination',
    html: '<helix-pagination></helix-pagination>',
    slug: 'compact',
    tsx: '',
  },
  {
    css: '',
    family: 'pagination',
    html: '<helix-pagination></helix-pagination>',
    slug: 'window',
    tsx: '',
  },
  {
    css: '',
    family: 'pagination',
    html: '<helix-pagination></helix-pagination>',
    slug: 'preview',
    tsx: '',
  },
  {
    css: '',
    family: 'pagination',
    html: '<helix-pagination></helix-pagination>',
    slug: 'compact-counts',
    tsx: '',
  },
  {
    css: 'a{}',
    family: 'pagination',
    html: '<helix-headless-pagination></helix-headless-pagination>',
    slug: 'headless',
    tsx: '',
  },
  { css: '', family: 'qr-code', html: '<helix-qr-code></helix-qr-code>', slug: 'preview', tsx: '' },
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

  // Off the markup rather than off the filename, the same test `helix component`'s `tokens`
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

/* `FilterMenu` registers only through `filter-input/menu`, and the reference's
   usage showed the family's import alone, so a page that wrote a picker got an
   inert element. */
describe('entries', () => {
  const split: HelixManifest = {
    modules: [
      {
        declarations: [{ name: 'HelixFilterInput', tagName: 'helix-filter-input' }],
        path: 'src/filter-input/root/filter-input-root.ts',
      },
      {
        declarations: [{ name: 'HelixFilterMenu', tagName: 'helix-filter-menu' }],
        path: 'src/filter-input/menu/filter-menu.ts',
      },
      {
        exports: [
          { declaration: { module: 'src/filter-input/root/filter-input-root.js', name: '*' } },
        ],
        path: 'src/filter-input/index.ts',
      },
      {
        exports: [{ declaration: { module: 'src/filter-input/menu/filter-menu.js', name: '*' } }],
        path: 'src/filter-input/menu/index.ts',
      },
      {
        declarations: [{ name: 'HelixOption', tagName: 'helix-option' }],
        path: 'src/option/root/option-root.ts',
      },
      {
        exports: [{ declaration: { module: 'src/option/root/option-root.js', name: '*' } }],
        path: 'src/option/root/index.ts',
      },
      {
        exports: [{ declaration: { module: 'src/option/root/option-root.js', name: '*' } }],
        path: 'src/option/index.ts',
      },
    ],
  }
  const entries = (slug: string): Record<string, string> =>
    Object.fromEntries(
      (findInCatalog(catalog([split]), slug)?.elements ?? []).map((element) => [
        element.tagName,
        element.entry,
      ]),
    )

  test('names the entry that registers each element, where it is not the family’s', () => {
    expect(entries('filter-input')).toEqual({
      'helix-filter-input': 'filter-input',
      'helix-filter-menu': 'filter-input/menu',
    })
  })

  test('reads a part the family’s entry registers as the family’s, beside a narrower entry', () => {
    expect(entries('option')).toEqual({ 'helix-option': 'option' })
  })

  test('falls back to the family where no entry says', () => {
    expect(catalog([manifest])[0]?.elements[0]?.entry).toBe('pagination')
  })
})

/* A container does not register another family's children, so a page that
   writes an option in a Select imports the Option family too, and the
   reference says so beside the Select's own entry. */
describe('imports', () => {
  const written: HelixManifest = {
    modules: [
      {
        declarations: [
          {
            description:
              "Options are an import of their own:\n\n```js\nimport '@fusion.dev/helix/select'\nimport '@fusion.dev/helix/option'\n```",
            name: 'HelixHeadlessSelect',
            tagName: 'helix-headless-select',
          },
          { name: 'HelixSelect', tagName: 'helix-select' },
        ],
        path: 'src/select/root/select-root.ts',
      },
      {
        declarations: [
          {
            description: "```js\nimport '@fusion.dev/helix/filter-input/menu'\n```",
            name: 'HelixFilterInput',
            tagName: 'helix-filter-input',
          },
        ],
        path: 'src/filter-input/root/filter-input-root.ts',
      },
    ],
  }

  test('are the other families a description imports beside the family', () => {
    expect(findInCatalog(catalog([written]), 'select')?.imports).toEqual(['option'])
  })

  test('and never the family itself', () => {
    expect(catalog([manifest])[0]?.imports).toEqual([])
  })

  /* `menu/filter` adds behavior and no element, so nothing else lists it, and
     the sandbox's `code-block` entry colors every Code Block from another
     package. Each was only in a description. */
  test('an entry of its own that no part carries is listed, and another package’s is kept whole', () => {
    expect(findInCatalog(catalog([written]), 'filter-input')?.imports).toEqual([
      'filter-input/menu',
    ])
    const extras: HelixManifest = {
      modules: [
        {
          declarations: [
            {
              description:
                "```js\nimport '@fusion.dev/helix/menu'\nimport '@fusion.dev/helix/menu/filter'\n```",
              name: 'HelixMenu',
              tagName: 'helix-menu',
            },
          ],
          path: 'src/menu/root/menu-root.ts',
        },
        {
          declarations: [
            {
              description:
                "```js\nimport '@fusion.dev/helix/code-block'\nimport '@fusion.dev/helix-sandbox/code-block'\n```",
              name: 'HelixCodeBlock',
              tagName: 'helix-code-block',
            },
          ],
          path: 'src/code-block/root/code-block-root.ts',
        },
      ],
    }
    const [codeBlock, menu] = catalog([extras])
    expect([menu?.usage.styled, codeBlock?.usage.styled]).toEqual([
      ["import '@fusion.dev/helix/menu'", "import '@fusion.dev/helix/menu/filter' // Menu Filter"],
      [
        "import '@fusion.dev/helix/code-block'",
        "import '@fusion.dev/helix-sandbox/code-block' // Sandbox Code Block",
      ],
    ])
  })

  /* A reader of the bare `// Menu Filter` took it for an import every menu
     needs. The attribute whose description names the entry is the one it
     turns on. */
  test('an entry of its own names the attribute it turns on', () => {
    const filtered: HelixManifest = {
      modules: [
        {
          declarations: [
            {
              attributes: [
                {
                  description: 'Does nothing until `@fusion.dev/helix/menu/filter` is imported.',
                  name: 'filterable',
                },
              ],
              description: "```js\nimport '@fusion.dev/helix/menu/filter'\n```",
              name: 'HelixMenu',
              tagName: 'helix-menu',
            },
          ],
          path: 'src/menu/root/menu-root.ts',
        },
      ],
    }
    expect(catalog([filtered])[0]?.usage.styled).toEqual([
      "import '@fusion.dev/helix/menu'",
      "import '@fusion.dev/helix/menu/filter' // Menu Filter, for filterable",
    ])
  })
})

/* An agent reading a family's `.md` or `.json` gets the lines to import, for
   the family and for each example, so a copied example registers what it
   writes. */
describe('import lines', () => {
  const library: HelixManifest = {
    modules: [
      {
        declarations: [
          {
            description:
              "```js\nimport '@fusion.dev/helix/select'\nimport '@fusion.dev/helix/option'\n```",
            helix: { examples: [{ description: 'A select.', slug: 'preview' }] },
            members: [
              { helix: { words: true }, kind: 'field', name: 'placeholder' },
              { kind: 'field', name: 'value' },
            ],
            name: 'HelixSelect',
            tagName: 'helix-select',
          },
        ],
        path: 'src/select/root/select-root.ts',
      },
      {
        declarations: [{ name: 'HelixOption', tagName: 'helix-option' }],
        path: 'src/option/root/option-root.ts',
      },
      {
        declarations: [{ name: 'HelixFlex', tagName: 'helix-flex' }],
        path: 'src/flex/root/flex-root.ts',
      },
    ],
  }
  const families = catalog(
    [library],
    [
      {
        css: '',
        family: 'select',
        html: '<helix-flex><helix-select><helix-option>A</helix-option></helix-select></helix-flex>',
        slug: 'preview',
        tsx: '',
      },
    ],
  )
  const select = findInCatalog(families, 'select')

  test('each example lists every entry it writes, its own family first', () => {
    expect(select?.examples[0]?.imports).toEqual([
      "import '@fusion.dev/helix/select'",
      "import '@fusion.dev/helix/flex'",
      "import '@fusion.dev/helix/option'",
    ])
  })

  test('the family’s usage is its entry and the families it imports beside it', () => {
    expect(select?.usage).toEqual({
      headless: [],
      styled: ["import '@fusion.dev/helix/select'", "import '@fusion.dev/helix/option' // Option"],
    })
  })

  test('each element names its specifier and the properties registerWords translates', () => {
    expect([select?.elements[0]?.specifier, select?.elements[0]?.words]).toEqual([
      '@fusion.dev/helix/select',
      ['placeholder'],
    ])
  })
})

/* The sandbox package's editor names the Sandbox family with `@family`, so the
   reference shows it on that family's page, imported from its own package,
   and the family's facts stay its root's. */
describe('another package', () => {
  const styled: HelixManifest = {
    helix: { package: '@fusion.dev/helix', version: '1.0.0' },
    modules: [
      {
        declarations: [
          {
            helix: {
              aliases: ['Playground'],
              category: 'tooling',
              since: '0.1.0',
              source: 'helix/styled/src/sandbox',
              status: 'stable',
            },
            name: 'HelixSandbox',
            summary: 'A source pane and a preview.',
            tagName: 'helix-sandbox',
          },
        ],
        path: 'src/sandbox/root/sandbox-root.ts',
      },
      {
        exports: [{ declaration: { module: 'src/sandbox/root/sandbox-root.js', name: '*' } }],
        path: 'src/sandbox/index.ts',
      },
    ],
  }
  const sandbox: HelixManifest = {
    helix: { package: '@fusion.dev/helix-sandbox', version: '1.0.0' },
    modules: [
      {
        declarations: [
          {
            helix: {
              aliases: ['Code editor'],
              category: 'forms',
              family: 'sandbox',
              since: '0.2.0',
              status: 'experimental',
            },
            name: 'HelixSandboxEditor',
            summary: 'An editable pane of source.',
            tagName: 'helix-sandbox-editor',
          },
        ],
        path: 'src/sandbox/editor/sandbox-editor.ts',
      },
      {
        exports: [{ declaration: { module: 'src/sandbox/editor/sandbox-editor.js', name: '*' } }],
        path: 'src/editor/index.ts',
      },
    ],
  }
  const families = catalog([styled, sandbox])
  const family = findInCatalog(families, 'sandbox')

  test('joins the family its @family names, and adds no family', () => {
    expect(families.map((one) => one.slug)).toEqual(['sandbox'])
    expect(family?.elements.map((element) => [element.tagName, element.package])).toEqual([
      ['helix-sandbox', '@fusion.dev/helix'],
      ['helix-sandbox-editor', '@fusion.dev/helix-sandbox'],
    ])
  })

  test('names the family over its folder', () => {
    const moved = structuredClone(sandbox)
    const module = moved.modules?.[0]
    if (module) {
      module.path = 'src/editor/root/editor-root.ts'
    }
    expect(catalog([styled, moved]).map((one) => one.slug)).toEqual(['sandbox'])
  })

  test('is imported from its own package, through the entry that registers it', () => {
    expect(family?.elements[1]?.specifier).toBe('@fusion.dev/helix-sandbox/editor')
    expect(family?.usage).toEqual({
      headless: [],
      styled: [
        "import '@fusion.dev/helix/sandbox'",
        "import '@fusion.dev/helix-sandbox/editor' // Sandbox Editor",
      ],
    })
  })

  test('keeps its own status, and the family keeps every fact of its root’s package', () => {
    expect(family?.elements.map((element) => element.status)).toEqual(['stable', 'experimental'])
    expect({
      aliases: family?.aliases,
      category: family?.category,
      package: family?.package,
      since: family?.since,
      source: family?.source,
      status: family?.status,
      summary: family?.summary,
    }).toEqual({
      aliases: ['Playground'],
      category: 'tooling',
      package: '@fusion.dev/helix',
      since: '0.1.0',
      source: 'helix/styled/src/sandbox',
      status: 'stable',
      summary: 'A source pane and a preview.',
    })
  })

  test('is the same family whichever manifest is read first', () => {
    const orders = [
      [styled, sandbox, manifest],
      [sandbox, styled, manifest],
      [manifest, sandbox, styled],
    ]
    const read = orders.map((order) => JSON.stringify(catalog(order, examples)))
    expect(new Set(read).size).toBe(1)
  })

  test('takes no facts where the package holding the root is not read', () => {
    const alone = findInCatalog(catalog([sandbox]), 'sandbox')
    expect(alone?.elements.map((element) => element.tagName)).toEqual(['helix-sandbox-editor'])
    expect({
      aliases: alone?.aliases,
      category: alone?.category,
      package: alone?.package,
      since: alone?.since,
      status: alone?.status,
      summary: alone?.summary,
    }).toEqual({ aliases: [], category: '', package: '', since: '', status: '', summary: '' })
  })

  test('is read from the tier where a manifest names no package', () => {
    expect(catalog([manifest])[0]?.elements[0]?.package).toBe('@fusion.dev/helix')
  })
})

/* What each package's `api.json` lists: the package holding the root lists the
   family whole, and a package adding an element lists that element alone,
   with none of the family's facts. */
describe('publishedBy', () => {
  const styled: HelixManifest = {
    helix: { package: '@fusion.dev/helix' },
    modules: [
      {
        declarations: [
          {
            helix: { status: 'stable' },
            name: 'HelixSandbox',
            summary: 'A source pane and a preview.',
            tagName: 'helix-sandbox',
          },
        ],
        path: 'src/sandbox/root/sandbox-root.ts',
      },
    ],
  }
  const sandbox: HelixManifest = {
    helix: { package: '@fusion.dev/helix-sandbox' },
    modules: [
      {
        declarations: [
          {
            helix: { family: 'sandbox', status: 'experimental' },
            name: 'HelixSandboxEditor',
            summary: 'An editable pane of source.',
            tagName: 'helix-sandbox-editor',
          },
        ],
        path: 'src/sandbox/editor/sandbox-editor.ts',
      },
    ],
  }
  const families = catalog([sandbox, styled])

  test('a package holding the root lists the family whole, with its own elements', () => {
    const [owned] = publishedBy(families, '@fusion.dev/helix')
    expect(owned && 'contributes' in owned).toBe(false)
    expect(owned?.elements.map((element) => element.tagName)).toEqual(['helix-sandbox'])
    expect(owned && 'summary' in owned ? owned.summary : '').toBe('A source pane and a preview.')
  })

  test('a package adding an element lists it alone, and names the package with the facts', () => {
    expect(publishedBy(families, '@fusion.dev/helix-sandbox')).toEqual([
      {
        contributes: true,
        elements: [expect.objectContaining({ tagName: 'helix-sandbox-editor' })],
        examples: [],
        label: 'Sandbox',
        package: '@fusion.dev/helix',
        slug: 'sandbox',
      },
    ])
  })

  test('names no package where none read holds the root', () => {
    const [alone] = publishedBy(catalog([sandbox]), '@fusion.dev/helix-sandbox')
    expect(alone && 'package' in alone).toBe(false)
  })
})

/* The headless tier is read without the styled one, so its families had no
   styled root, and the first declaration read gave a part's summary. */
describe('a family with no styled root', () => {
  const headless: HelixManifest = {
    helix: { package: '@fusion.dev/helix-headless' },
    modules: [
      {
        declarations: [
          {
            helix: { status: 'experimental' },
            name: 'HelixHeadlessAccordionItem',
            summary: 'One collapsible section.',
            tagName: 'helix-headless-accordion-item',
          },
        ],
        path: 'src/accordion/item/accordion-item.ts',
      },
      {
        declarations: [
          {
            helix: { status: 'stable' },
            name: 'HelixHeadlessAccordion',
            summary: 'A group of collapsible sections.',
            tagName: 'helix-headless-accordion',
          },
        ],
        path: 'src/accordion/root/accordion-root.ts',
      },
    ],
  }

  test('reads its facts from the headless root', () => {
    const [accordion] = catalog([headless])
    expect([accordion?.summary, accordion?.status, accordion?.package]).toEqual([
      'A group of collapsible sections.',
      'stable',
      '@fusion.dev/helix-headless',
    ])
  })
})

describe('renders', () => {
  test('are the wide, narrow, and dark baselines beside an example, and nothing else', () => {
    expect(
      rendersOf('preview', [
        'preview.png',
        'preview.dark.png',
        'preview.narrow.png',
        'preview.wide.png',
        'cards.png',
        'preview-x.png',
      ]),
    ).toEqual([
      { file: 'preview.dark.png', shot: 'dark' },
      { file: 'preview.narrow.png', shot: 'narrow' },
      { file: 'preview.png', shot: 'wide' },
    ])
  })
})
