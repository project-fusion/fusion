#!/usr/bin/env node
/**
 * Writes `docs/11-component-reference.md` from the manifests.
 *
 * The document it replaces was transcribed by hand, and had drifted in both
 * directions at once: missing `Divider`, `Menu`, `Tree`, `Flex`, `Grid` and
 * `TableColumn`, while still describing a `Clock`, a `Combobox`, a `CopyButton`
 * and a `DatePicker` that this repository has never had. Both faults are the
 * same fault. A reference maintained by retyping is a second source of truth
 * for something that already has one, and the copy is always the stale one.
 *
 * **The styled tier only, which is not a shortcut.** A styled component extends
 * its headless base, and the analyzer resolves inheritance across packages, so
 * the styled entry already carries every inherited member with the base it came
 * from named against it. Documenting both tiers would print most of the library
 * twice to say the same thing.
 *
 * **First paragraph in a table cell, and the whole thing everywhere else.** A
 * cell holding four paragraphs is a table nobody reads, so a property's own
 * reasoning stays on the component and on `/components/<family>`, which renders
 * the manifest in a browser. A component's description is not in a cell: it is
 * prose under a heading, and truncating that threw away everything `Calendar`
 * says about its three modes.
 *
 * Run `bun run reference` to write it, and `bun run check:reference` to fail
 * when it is behind. `verify` runs the check rather than the writer, for the
 * same reason it runs `biome ci`: a step that edits your files cannot tell you
 * whether they were right.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MANIFEST = 'helix/web/custom-elements.json'
const OUTPUT = 'docs/11-component-reference.md'

/**
 * Whether a member belongs in a reference at all.
 *
 * Public only, and nothing inherited from `HelixElement`. Every component in
 * the library extends it, so its members would appear on all fifty-two: an
 * `internals` field and two lifecycle methods that exist so components do not
 * have to think about the shadow root. Printing them everywhere says the same
 * infrastructural thing fifty-two times and buries the four properties a
 * consumer came to read.
 *
 * `HelixFormElement` is deliberately not on that list. What it contributes is
 * form participation, which is the API of a form control.
 */
const INFRASTRUCTURE = new Set(['HelixElement'])

const isPublic = (member) =>
  member.privacy !== 'private' &&
  member.privacy !== 'protected' &&
  !INFRASTRUCTURE.has(member.inheritedFrom?.name)

/** A cell's worth of a description: the first paragraph, on one line. */
const cell = (text) =>
  (text ?? '').split('\n\n')[0].replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()

/** A type, escaped so its unions do not end the column they are in. */
const code = (text) => (text ? `\`${text.replace(/\|/g, '\\|')}\`` : '-')

/** A markdown table, or nothing at all where there are no rows to put in one. */
const table = (heading, columns, rows) => {
  if (rows.length === 0) {
    return ''
  }
  const head = `| ${columns.join(' | ')} |`
  const rule = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
  return `\n#### ${heading}\n\n${head}\n${rule}\n${body}\n`
}

/* Family and part come from where the file is, not from the tag name. A tag is
   a string the family prefix can only be guessed out of: `helix-button-group`
   is one family and `helix-tabs-tab` is a part of another, and nothing in the
   name says which. The path says both. */
const place = (path) => {
  const [, family = '', part = ''] = path.match(/^src\/([^/]+)\/([^/]+)\//) ?? []
  return { family, part }
}

const title = (slug) =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const families = new Map()

for (const module of manifest.modules ?? []) {
  for (const declaration of module.declarations ?? []) {
    if (!declaration.tagName) {
      continue
    }
    const { family, part } = place(module.path)
    if (!family) {
      continue
    }
    const parts = families.get(family) ?? []
    parts.push({ declaration, part })
    families.set(family, parts)
  }
}

const lines = [
  '# Component reference',
  '',
  '*Generated from `helix/web/custom-elements.json` by `bun run reference`. Do',
  'not edit: `bun run check:reference` fails when this file and the manifest',
  'disagree, and the manifest is regenerated from the source on every build.*',
  '',
  'The styled tier, which is what an application writes. Every styled component',
  'extends a headless one and inherits its API, so anything a base contributes is',
  'here too, with the base named in the "From" column. The prose behind each of',
  'these lives on the component itself and is rendered in full at',
  '`/components/<family>`.',
  '',
]

for (const [family, parts] of [...families].sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`## ${title(family)}`, '')
  /* Root first, then the rest alphabetically. A family reads from the thing
     that holds the others, and `item` before `root` is alphabetical order
     telling you about the alphabet rather than about the component. */
  const ordered = parts.sort((a, b) =>
    a.part === 'root' ? -1 : b.part === 'root' ? 1 : a.part.localeCompare(b.part),
  )

  for (const { declaration, part } of ordered) {
    const {
      attributes = [],
      cssParts = [],
      cssProperties = [],
      description,
      events = [],
      members = [],
      slots = [],
      summary,
      superclass,
      tagName,
    } = declaration

    lines.push(`### ${title(part)} — \`${tagName}\``, '')
    if (summary) {
      lines.push(summary, '')
    }
    if (superclass?.name) {
      lines.push(`Extends \`${superclass.name}\`.`, '')
    }
    if (description) {
      lines.push(description.trim(), '')
    }

    const attributeOf = new Map(attributes.map((one) => [one.fieldName ?? one.name, one.name]))
    const fields = members
      .filter((member) => member.kind === 'field' && isPublic(member))
      .sort((a, b) => a.name.localeCompare(b.name))

    lines.push(
      table(
        'Properties',
        ['Property', 'Attribute', 'Type', 'Default', 'From', 'Description'],
        fields.map((field) => [
          `\`${field.name}\``,
          attributeOf.has(field.name) ? `\`${attributeOf.get(field.name)}\`` : '-',
          code(field.type?.text),
          field.default ? `\`${field.default}\`` : '-',
          field.inheritedFrom?.name ? `\`${field.inheritedFrom.name}\`` : '-',
          cell(field.description),
        ]),
      ).trimEnd(),
    )

    const methods = members
      .filter((member) => member.kind === 'method' && isPublic(member))
      .sort((a, b) => a.name.localeCompare(b.name))

    lines.push(
      table(
        'Methods',
        ['Method', 'From', 'Description'],
        methods.map((method) => [
          `\`${method.name}()\``,
          method.inheritedFrom?.name ? `\`${method.inheritedFrom.name}\`` : '-',
          cell(method.description),
        ]),
      ).trimEnd(),
    )

    lines.push(
      table(
        'Events',
        ['Event', 'Type', 'Description'],
        events.map((event) => [
          `\`${event.name}\``,
          code(event.type?.text),
          cell(event.description),
        ]),
      ).trimEnd(),
    )

    lines.push(
      table(
        'Slots',
        ['Slot', 'Description'],
        slots.map((slot) => [
          slot.name ? `\`${slot.name}\`` : '*(default)*',
          cell(slot.description),
        ]),
      ).trimEnd(),
    )

    lines.push(
      table(
        'Parts',
        ['Part', 'Description'],
        cssParts.map((one) => [`\`${one.name}\``, cell(one.description)]),
      ).trimEnd(),
    )

    lines.push(
      table(
        'Custom properties',
        ['Property', 'Description'],
        cssProperties.map((one) => [`\`${one.name}\``, cell(one.description)]),
      ).trimEnd(),
    )

    lines.push('')
  }
}

const written = `${lines
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()}\n`
const output = join(process.cwd(), OUTPUT)

if (process.argv.includes('--check')) {
  const existing = readFileSync(output, 'utf8')
  if (existing !== written) {
    console.error(
      `${OUTPUT} is behind the manifest. Run \`bun run reference\` and commit the result.`,
    )
    process.exit(1)
  }
  console.log(`reference: ${families.size} families, current`)
} else {
  writeFileSync(output, written)
  console.log(`reference: ${families.size} families written to ${OUTPUT}`)
}
