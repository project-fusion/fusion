/**
 * The component reference, rendered from a manifest to markdown.
 *
 * **Pure, and it lives here rather than in a site.** A manifest-to-markdown
 * renderer is documentation for Helix: a consumer installing `@fusion.dev/helix-docs`
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
import type {
  Documented,
  HelixCssProperty,
  HelixDeclaration,
  HelixManifest,
  HelixMember,
} from '@fusion.dev/helix-cem'
import { startCase } from './naming.js'

/**
 * An example, as much of one as a markdown reference prints.
 *
 * Structural rather than the catalog's `Example`, so this module does not
 * import from one that imports it. Anything the catalog returns satisfies it.
 */
export interface ReferenceExample {
  css: string
  description: string
  html: string
  label: string
}

/** What to put above the reference, for a caller that generates a file. */
export interface ReferenceOptions {
  /**
   * Examples to print under each family, keyed by family slug.
   *
   * **The reference `.md` carries the examples and the HTML page does not**,
   * and the difference is deliberate rather than an omission on one side. That
   * page answers what a component can do, and the sandbox beside it answers
   * what the component looks like; a reference that started collecting pictures
   * would stop being the one place you can trust to be complete. An agent has
   * no sandbox to be sent to, and to it an example is text rather than a
   * picture, so the `.md` is the only surface that has to answer both.
   */
  examples?: Record<string, ReferenceExample[]>
  /** Only these families. Omitted renders everything in the manifest. */
  families?: string[]
  /**
   * Frontmatter, emitted above the heading.
   *
   * Provenance rather than decoration: a generated document should say what it
   * was generated from, so a reader who finds one detached from this repository
   * can still tell where to look. Keys are written in the order given, because
   * a reader scans the first line and `title` is what they want there.
   */
  frontmatter?: Array<[string, string]>
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
const table = (depth: number, heading: string, columns: string[], rows: string[][]): string => {
  if (rows.length === 0) {
    return ''
  }
  const head = `| ${columns.join(' | ')} |`
  const rule = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
  return `\n${'#'.repeat(depth)} ${heading}\n\n${head}\n${rule}\n${body}\n`
}

/**
 * The family and part a declaration belongs to, from where its file is.
 *
 * Not from the tag name. A tag is a string the family prefix can only be
 * guessed out of: `helix-button-group` is one family and `helix-tab` is a
 * part of another, and nothing in the name says which. The path says both.
 */
export const place = (path: string | undefined): { family: string; part: string } => {
  const [, family = '', part = ''] = /^src\/([^/]+)\/([^/]+)\//.exec(path ?? '') ?? []
  return { family, part }
}

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
const element = (depth: number, declaration: HelixDeclaration, part: string): string[] => {
  const {
    attributes = [],
    cssParts = [],
    cssProperties = [],
    cssStates = [],
    description,
    events = [],
    members = [],
    slots = [],
    summary,
    superclass,
    tagName,
  } = declaration

  const lines = [`${'#'.repeat(depth)} ${startCase(part)} (\`${tagName}\`)`, '']
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
      depth + 1,
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
      depth + 1,
      'Methods',
      ['Method', 'From', 'Description'],
      named(members, 'method').map((method) => [
        `\`${method.name}()\``,
        method.inheritedFrom?.name ? `\`${method.inheritedFrom.name}\`` : '-',
        cell(method.description),
      ]),
    ).trimEnd(),
    table(
      depth + 1,
      'Events',
      ['Event', 'Type', 'Description'],
      events.map((event) => [`\`${event.name}\``, code(event.type?.text), cell(event.description)]),
    ).trimEnd(),
    table(
      depth + 1,
      'Slots',
      ['Slot', 'Description'],
      slots.map((slot: Documented) => [
        slot.name ? `\`${slot.name}\`` : '*(default)*',
        cell(slot.description),
      ]),
    ).trimEnd(),
    table(
      depth + 1,
      'Parts',
      ['Part', 'Description'],
      cssParts.map((one: Documented) => [`\`${one.name}\``, cell(one.description)]),
    ).trimEnd(),
    /* A "From" column, because a hook can now arrive from a component this one
       borrowed a stylesheet from rather than be its own. Without it a borrowed
       `--icon-button-radii` reads on the Copy Button page as a hook Copy Button
       named, and a consumer who guesses `--copy-button-radii` from that gets
       nothing. */
    table(
      depth + 1,
      'Custom properties',
      ['Property', 'From', 'Description'],
      cssProperties.map((one: HelixCssProperty) => [
        `\`${one.name}\``,
        one.inheritedFrom?.name ? `\`${one.inheritedFrom.name}\`` : '-',
        cell(one.description),
      ]),
    ).trimEnd(),
    /* Written as the selector a consumer types, because a custom state is in
       no attribute and no property and this table is the only place one is
       learned. Sorted, since `settled` arrives from the base class after the
       element's own. */
    table(
      depth + 1,
      'Custom states',
      ['State', 'Description'],
      [...cssStates]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((one: Documented) => [`\`:state(${one.name})\``, cell(one.description)]),
    ).trimEnd(),
    '',
  )
  return lines
}

/**
 * The leading `<!-- @summary -->` comment, which the description above already
 * carries. It is how an example declares its own one-liner to the analyzer, so
 * it belongs in the file and not a second time in the prose beside it.
 */
const withoutSummary = (html: string): string => html.replace(/^<!--\s*@summary[\s\S]*?-->\n*/, '')

/** One family's examples, as the markdown a reader or an agent can run. */
const shown = (depth: number, examples: ReferenceExample[]): string[] => {
  if (examples.length === 0) {
    return []
  }
  const lines = [`${'#'.repeat(depth)} Examples`, '']
  for (const example of examples) {
    lines.push(`${'#'.repeat(depth + 1)} ${example.label}`, '')
    if (example.description) {
      lines.push(example.description, '')
    }
    lines.push('```html', withoutSummary(example.html), '```', '')
    if (example.css) {
      lines.push('```css', example.css, '```', '')
    }
  }
  return lines
}

/**
 * A manifest, as the markdown reference for everything in it.
 *
 * The caller supplies the manifest and whatever preamble belongs above it, so
 * the same renderer serves the whole-library document in `docs/` and a
 * per-family page without either one knowing about the other.
 *
 * **A single family gets no heading naming it**, because the title already
 * does: a document about the accordion should not say Accordion twice before
 * its first sentence. More than one and the headings are what separate them.
 */
export const reference = (manifest: HelixManifest, options: ReferenceOptions = {}): string => {
  const front = options.frontmatter ?? []
  const lines = [
    ...(front.length > 0
      ? ['---', ...front.map(([key, value]) => `${key}: ${value}`), '---', '']
      : []),
    `# ${options.title ?? 'Component reference'}`,
    '',
    ...(options.lede ?? []),
  ]
  const wanted = options.families
  const families = referenceFamilies(manifest).filter(
    (entry) => wanted === undefined || wanted.includes(entry.family),
  )
  /* Everything under a family heading sits one level deeper than it would in a
     document that has no family heading to sit under. Without this a page about
     one component opens at `###`, which is a heading level with nothing above
     it and reads as a fragment of a larger file. */
  const depth = families.length > 1 ? 3 : 2
  for (const { family, parts } of families) {
    if (families.length > 1) {
      lines.push(`## ${startCase(family)}`, '')
    }
    for (const { declaration, part } of parts) {
      lines.push(...element(depth, declaration, part))
    }
    lines.push(...shown(depth, options.examples?.[family] ?? []))
  }
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}
