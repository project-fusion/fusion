/* Writes `src/examples.generated.ts`: each family `@fusion.dev/helix` draws on
   React Native, with its name and summary from the styled tier's `api.json`,
   and its styled examples from `examples.json` in their order. Each example
   carries its name, what it shows on a phone, and the source the sandbox
   shows in colored runs, and imports the web example itself from its
   `.examples` file, which the gallery runs as it is.

   bun scripts/examples.ts */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { highlight, syntaxHighlighter } from '@fusion.dev/helix-sandbox/highlight'

const here = join(import.meta.dir, '..')
const OUT = 'src/examples.generated.ts'

/** What `api.json` says of a family, as far as the gallery reads it. */
interface ApiFamily {
  readonly label: string
  readonly platforms?: Readonly<Record<string, unknown>>
  readonly slug: string
  readonly summary?: string
}

/** What `examples.json` says of an example, as far as the gallery reads it. */
interface Listed {
  readonly css: string
  readonly description?: string
  readonly label: string
  readonly platforms?: { readonly 'react-native'?: { readonly description?: string } }
  readonly slug: string
  readonly tier: string
  readonly tsx: string
}

const read = <T>(specifier: string): T =>
  JSON.parse(readFileSync(Bun.resolveSync(specifier, here), 'utf8')) as T

const ENTITIES: Readonly<Record<string, string>> = {
  '&#39;': "'",
  '&amp;': '&',
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"',
}

/** The source in runs of one color each, `[kind, text]`, as the sandbox's
    highlighter colors it, with an empty kind for plain text. */
const runs = (source: string): [string, string][] =>
  [
    ...highlight(source, 'tsx', syntaxHighlighter).matchAll(
      /<span class="helix-syntax-([a-z]+)[^"]*">([^<]*)<\/span>|([^<]+)/g,
    ),
  ].map(([, kind, inside, plain]) => [
    kind ?? '',
    (inside ?? plain ?? '').replace(
      /&(#39|amp|gt|lt|quot);/g,
      (entity) => ENTITIES[entity] ?? entity,
    ),
  ])

const api = read<{ families: readonly ApiFamily[] }>('@fusion.dev/helix/api.json')
const listed = read<{ examples: Readonly<Record<string, readonly Listed[]>> }>(
  '@fusion.dev/helix/examples.json',
).examples

/* A TSX example that imports its stylesheet draws with it on the web
   alone. One that sets its hooks in a `style` draws the same on a phone. */
const SHEET = /^import '\.\/[^']+\.css'/m

const imports: string[] = []
const families = api.families
  .filter((family) => family.platforms?.['react-native'] !== undefined)
  .map((family) => {
    const examples = (listed[family.slug] ?? [])
      .filter((example) => example.tier === 'styled' && example.tsx !== '')
      .map((example) => {
        const name = `${family.slug}_${example.slug}`.replace(/-/g, '_')
        imports.push(
          `import { Example as ${name} } from 'helix-example:${family.slug}/${example.slug}'`,
        )
        const description =
          example.platforms?.['react-native']?.description ?? example.description ?? ''
        return `    {
      code: ${JSON.stringify(runs(example.tsx.trimEnd()))},
      description: ${JSON.stringify(description)},
      Example: ${name},
      label: ${JSON.stringify(example.label)},
      slug: ${JSON.stringify(example.slug)},
      styled: ${SHEET.test(example.tsx)},
    },`
      })
    return `  {
    examples: [
${examples.join('\n')}
    ],
    label: ${JSON.stringify(family.label)},
    slug: ${JSON.stringify(family.slug)},
    summary: ${JSON.stringify(family.summary ?? '')},
  },`
  })

writeFileSync(
  join(here, OUT),
  `/* Written by scripts/examples.ts from the api.json and examples.json of
   @fusion.dev/helix. Do not edit: run it again. */
import type { GalleryFamily } from './gallery'
${imports.join('\n')}

export const FAMILIES: readonly GalleryFamily[] = [
${families.join('\n')}
]
`,
)
console.log(`${OUT}: ${families.length} families, ${imports.length} examples`)
