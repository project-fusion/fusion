/**
 * The component reference, rendered from a manifest to markdown.
 *
 * **Pure, and it lives here rather than in a site.** A manifest-to-markdown
 * renderer is documentation for Helix: a consumer installing `@helix-io/docs`
 * should get the component reference along with the prose, and a site should be
 * one of its readers rather than its owner. It also has to be pure, because a
 * content package that touched the filesystem would trace itself into every
 * consumer's server bundle. Reading the manifest is the caller's job.
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
 * prose under a heading, and truncating that threw away everything `Date
 * Picker` says about its three modes.
 */
import type { Documented, HelixDeclaration, HelixManifest, HelixMember } from '@helix-io/cem'

/** What to put above the reference, for a caller that generates a file. */
export interface ReferenceOptions {
  /** Prose under the heading, already wrapped. Omitted where absent. */
  lede?: string[]
  /** Top-level heading. */
  title?: string
}

/**
 * Whether a member belongs in a reference at all.
 *
 * Public only, and nothing inherited from `HelixElement`. Every component in
 * the library extends it, so its members would appear on all of them: an
 * `internals` field and two lifecycle methods that exist so components do not
 * have to think about the shadow root. Printing them everywhere says the same
 * infrastructural thing once per component and buries the four properties a
 * consumer came to read.
 *
 * `HelixFormElement` is deliberately not on that list. What it contributes is
 * form participation, which is the API of a form control.
 */
const INFRASTRUCTURE = new Set(['HelixElement'])

const isPublic = (member: HelixMember): boolean =>
  member.privacy !== 'private' &&
  member.privacy !== 'protected' &&
  !INFRASTRUCTURE.has(member.inheritedFrom?.name ?? '')

/** A cell's worth of a description: the first paragraph, on one line. */
const cell = (text: string | undefined): string =>
  (text ?? '').split('\n\n')[0]?.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim() ?? ''

/** A type, escaped so its unions do not end the column they are in. */
const code = (text: string | undefined): string =>
  text ? `\`${text.replace(/\|/g, '\\|')}\`` : '-'

/** A markdown table, or nothing at all where there are no rows to put in one. */
const table = (heading: string, columns: string[], rows: string[][]): string => {
  if (rows.length === 0) {
    return ''
  }
  const head = `| ${columns.join(' | ')} |`
  const rule = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
  return `\n#### ${heading}\n\n${head}\n${rule}\n${body}\n`
}

/**
 * The family and part a declaration belongs to, from where its file is.
 *
 * Not from the tag name. A tag is a string the family prefix can only be
 * guessed out of: `helix-button-group` is one family and `helix-tabs-tab` is a
 * part of another, and nothing in the name says which. The path says both.
 */
export const place = (path: string | undefined): { family: string; part: string } => {
  const [, family = '', part = ''] = /^src\/([^/]+)\/([^/]+)\//.exec(path ?? '') ?? []
  return { family, part }
}

/** A slug as a heading: `button-group` reads `Button Group`. */
export const title = (slug: string): string =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

/** One family's declarations, in the order a reference prints them. */
export interface ReferenceFamily {
  family: string
  parts: Array<{ declaration: HelixDeclaration; part: string }>
}

/**
 * Every family in a manifest, alphabetical, each with its parts.
 *
 * Root first inside a family, then the rest alphabetically. A family reads from
 * the thing that holds the others, and `item` before `root` is alphabetical
 * order telling you about the alphabet rather than about the component.
 */
export const referenceFamilies = (manifest: HelixManifest): ReferenceFamily[] => {
  const families = new Map<string, ReferenceFamily['parts']>()
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName) {
        continue
      }
      const { family, part } = place(module.path)
      if (!family) {
        continue
      }
      families.set(family, [...(families.get(family) ?? []), { declaration, part }])
    }
  }
  return [...families]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([family, parts]) => ({
      family,
      parts: [...parts].sort((a, b) =>
        a.part === 'root' ? -1 : b.part === 'root' ? 1 : a.part.localeCompare(b.part),
      ),
    }))
}

/** The tables for one element, in the order they are printed. */
const element = (declaration: HelixDeclaration, part: string): string[] => {
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

  const lines = [`### ${title(part)} (\`${tagName}\`)`, '']
  if (summary) {
    lines.push(summary, '')
  }
  if (superclass?.name) {
    lines.push(`Extends \`${superclass.name}\`.`, '')
  }
  if (description) {
    lines.push(description.trim(), '')
  }

  const attributeOf = new Map(
    attributes.map((one) => [one.fieldName ?? one.name, one.name] as const),
  )
  const named = (rows: HelixMember[], kind: string): HelixMember[] =>
    rows
      .filter((row) => row.kind === kind && isPublic(row))
      .sort((a, b) => a.name.localeCompare(b.name))

  lines.push(
    table(
      'Properties',
      ['Property', 'Attribute', 'Type', 'Default', 'From', 'Description'],
      named(members, 'field').map((field) => [
        `\`${field.name}\``,
        attributeOf.has(field.name) ? `\`${attributeOf.get(field.name)}\`` : '-',
        code(field.type?.text),
        field.default ? `\`${field.default}\`` : '-',
        field.inheritedFrom?.name ? `\`${field.inheritedFrom.name}\`` : '-',
        cell(field.description),
      ]),
    ).trimEnd(),
    table(
      'Methods',
      ['Method', 'From', 'Description'],
      named(members, 'method').map((method) => [
        `\`${method.name}()\``,
        method.inheritedFrom?.name ? `\`${method.inheritedFrom.name}\`` : '-',
        cell(method.description),
      ]),
    ).trimEnd(),
    table(
      'Events',
      ['Event', 'Type', 'Description'],
      events.map((event) => [`\`${event.name}\``, code(event.type?.text), cell(event.description)]),
    ).trimEnd(),
    table(
      'Slots',
      ['Slot', 'Description'],
      slots.map((slot: Documented) => [
        slot.name ? `\`${slot.name}\`` : '*(default)*',
        cell(slot.description),
      ]),
    ).trimEnd(),
    table(
      'Parts',
      ['Part', 'Description'],
      cssParts.map((one: Documented) => [`\`${one.name}\``, cell(one.description)]),
    ).trimEnd(),
    table(
      'Custom properties',
      ['Property', 'Description'],
      cssProperties.map((one: Documented) => [`\`${one.name}\``, cell(one.description)]),
    ).trimEnd(),
    '',
  )
  return lines
}

/**
 * A manifest, as the markdown reference for everything in it.
 *
 * The caller supplies the manifest and whatever preamble belongs above it, so
 * the same renderer serves the whole-library document in `docs/` and a
 * per-family page without either one knowing about the other.
 */
export const reference = (manifest: HelixManifest, options: ReferenceOptions = {}): string => {
  const lines = [`# ${options.title ?? 'Component reference'}`, '', ...(options.lede ?? [])]
  for (const { family, parts } of referenceFamilies(manifest)) {
    lines.push(`## ${title(family)}`, '')
    for (const { declaration, part } of parts) {
      lines.push(...element(declaration, part))
    }
  }
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}
