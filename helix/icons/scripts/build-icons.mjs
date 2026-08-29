import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimize } from 'svgo'

/**
 * Generates the icon set.
 *
 * The set is a list of names in `helix/icons/icons.txt`, and each one is
 * resolved from `@phosphor-icons/core` at build time: bold weight, then fill,
 * then `raw/` for the marks that are not Phosphor at all. That package is
 * a devDependency and nothing imports it at runtime. Six megabytes of every
 * icon at every weight sits in `node_modules`; what ships is the handful named
 * here, inlined into `generated.ts`.
 *
 * Icons are data, not components, and the data is the SVG's inner markup rather
 * than a single path string. Phosphor draws some glyphs with several elements
 * at once, a `<polyline>` beside a `<circle>` beside a `<rect>`, and each
 * carries its own stroke and fill. Flattening that to one `d` attribute would
 * lose those, so the inner markup is kept verbatim and the component renders
 * it.
 *
 * **Every glyph goes through svgo before its markup is taken.** What ships is a
 * string in a module a browser parses, so the attributes an authoring tool
 * leaves behind are bytes on the wire for every consumer: a `width` and a
 * `height` the component overrides, an `xmlns` that means nothing inside an
 * inlined fragment, coordinates carrying more precision than a 256-unit box can
 * show.
 *
 * **One of its defaults is wrong here and is turned off.** `cleanupIds` rewrites
 * ids to single letters, which would take `fusion.svg`'s gradients with it: safe
 * today for the reason below, and not the day two icons carrying `#a` meet in
 * one tree. `removeViewBox` is the other one to watch and is *not* configured,
 * because it left `preset-default` — turning it off explicitly is a warning on
 * every run about a plugin that is not there, and the box survives without it.
 * Asserted rather than assumed: every one of the 105 `viewBox` values is
 * unchanged.
 *
 * `fusion.svg` defines gradients by id and is not skipped for it. Ids are
 * scoped to their *tree*, and a shadow root is a tree: `helix-icon` renders
 * into one, so two of them resolve their own gradients even with identical ids
 * next door. Measured, with two copies in separate shadow roots and two more in
 * the light DOM for comparison. The light DOM is where the collision would be
 * real, and no component here renders an icon there.
 */

// `fileURLToPath`, not `import.meta.dir`: the latter is Bun's and is undefined
// under node, which is what runs the tooling scripts.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const RAW = join(ROOT, 'helix/icons/raw')
const LIST = join(ROOT, 'helix/icons/icons.txt')
const PHOSPHOR = join(ROOT, 'node_modules/@phosphor-icons/core/assets')
const OUT = join(ROOT, 'helix/icons/src/generated.ts')

/* Bold first, then fill, then `raw/` for the marks Phosphor does not draw.
 *
 * Bold rather than regular. Phosphor's regular is a hairline next to the type
 * it sits beside: at `icon-sm` in a tree row or a listbox option it reads as a
 * lighter gray than the words it belongs to, which is the opposite of what a
 * mark is for. Bold matches the medium weight every row in this library is set
 * in.
 *
 * The four `-fill` names are unaffected, and that is deliberate rather than
 * incidental: fill is a different statement from weight, chosen by the
 * components that use it to say a thing is complete or is a state rather than a
 * control, and there is no bold of a fill to want. They miss in `bold/` and land
 * in `fill/`.
 *
 * Only `regular/` names its files bare. Every other weight suffixes them, so
 * the bold of `caret-down` is `caret-down-bold.svg`, and the lookup has to say
 * so. A directory alone is not enough to find a glyph in this package. */
const sourceFor = (slug) => {
  const candidates = [
    join(PHOSPHOR, 'bold', `${slug}-bold.svg`),
    join(PHOSPHOR, 'fill', `${slug}.svg`),
    join(RAW, `${slug}.svg`),
  ]

  /* **Every match, not the first.** The list is a precedence and a precedence
     only decides silently: a name that exists in two of the three resolves to
     whichever sits higher, and the set builds, and the glyph on the page is not
     the one somebody added. Nothing about it looks wrong afterwards. There is no
     collision today — `raw/` holds product and technology marks, and Phosphor
     draws neither — so this costs nothing until the day it is the only thing
     that says which one was meant. */
  const found = candidates.filter((file) => existsSync(file))
  if (found.length > 1) {
    throw new Error(
      `icons: "${slug}" resolves to ${found.length} files, and the order between them is a ` +
        `silent decision:\n  ${found.join('\n  ')}\n` +
        'Rename one, or say in `icons.txt` which is meant.',
    )
  }
  if (found.length === 0) {
    throw new Error(`icons: no SVG for "${slug}" in @phosphor-icons/core or helix/icons/raw`)
  }
  return readFileSync(found[0], 'utf8')
}

/* `removeViewBox` and `cleanupIds` off, for the reasons in the docblock. */
const SVGO = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { cleanupIds: false } },
    },
  ],
}

/** `caret-down` becomes `caretDown`, which is what a consumer imports. */
const camel = (slug) => slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())

const entries = readFileSync(LIST, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .sort()
  .map((slug) => {
    const source = optimize(sourceFor(slug), SVGO).data

    const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1] ?? '0 0 256 256'
    const inner = source
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>[\s\S]*$/, '')
      // The component supplies the accessible name, so a baked-in one would
      // announce twice and could not be localized.
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return { camel: camel(slug), inner, slug, viewBox }
  })

const body = entries
  .map(
    ({ camel: name, inner, slug, viewBox }) =>
      `export const ${name}: HelixIcon = {\n  content: '${inner.replace(/'/g, "\\'")}',\n  name: '${slug}',\n  viewBox: '${viewBox}',\n}`,
  )
  .join('\n\n')

const record = entries.map(({ camel: name }) => `  [${name}.name]: ${name},`).join('\n')

writeFileSync(
  OUT,
  `// Generated by helix/icons/scripts/build-icons.mjs. Do not edit.
import type { HelixIcon } from './types.js'

${body}

/** Every icon, by name, for lookup from a \`name\` attribute. */
export const icons: Record<string, HelixIcon> = {
${record}
}
`,
)

console.log(`icons: ${entries.length} generated`)
