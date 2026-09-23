/**
 * Turns a directory of SVG files into the module `<helix-icon>` draws from.
 *
 * **Published, because the shape is ours and the tool that makes it should
 * travel with it.** An icon is `{ content, name, viewBox }`, so any set answers
 * it, and until this shipped the only way to get one was to hand-write the
 * objects or to send a pull request against this package. A consumer's own
 * drawings, a subset of Phosphor larger than the hundred and eight here, or
 * another library's set are all the same job, and it is this one.
 *
 * **A directory and a suffix, rather than knowledge of anybody's layout.** The
 * sets differ in how they name a file for a weight: Phosphor writes
 * `caret-down-bold.svg` and leaves regular bare, and another library will do
 * something else. So the caller says which directories to look in and what a
 * file is called, and this stays a reader of files.
 *
 * **Sources are a precedence, and a name in two of them is an error.** A
 * precedence decides silently: the glyph on the page would be whichever
 * directory sat higher, and nothing about it looks wrong afterwards. This is the
 * rule the Helix set has always been built under, and it is the consumer's now
 * as well.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Config, optimize } from 'svgo'

/** One place to look for glyphs, and what a file is called when it is there. */
export interface IconSource {
  /** Where the SVG files are. */
  directory: string
  /**
   * What sits between the name and `.svg`, for a set that spells a weight into
   * the file name. Phosphor's bold is `caret-down-bold.svg`; its regular, and
   * most other sets, are bare.
   */
  suffix?: string
}

/** What to build, and where to put it. */
export interface BuildOptions {
  /**
   * The names to resolve, in the order they should be written.
   *
   * Left out, every glyph in the sources is taken, which is what a consumer
   * pointing at their own folder of drawings usually means.
   */
  names?: string[]
  /** Where to write the module. */
  out: string
  sources: IconSource[]
  /**
   * Also write the record `<helix-icon name>` reads.
   *
   * **Off by default, and the default is the point.** The record names every
   * glyph, so no bundler can drop any of it: it is what a consumer pays for the
   * convenience of naming an icon in markup. A module built for import does not
   * need one, and one that has it charges everybody for a door they may not
   * use.
   */
  index?: boolean
  /** Where the emitted module imports `HelixIcon` from. */
  typeImport?: string
}

/* `removeViewBox` and `cleanupIds` off: the first would take the box a glyph is
   drawn in, and the second rewrites ids to single letters, which breaks a mark
   that defines a gradient by id. */
const SVGO: Config = {
  multipass: true,
  plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }],
}

/** `caret-down` becomes `caretDown`, which is what a consumer imports. */
const camel = (slug: string): string =>
  slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())

/** Every name a source holds, for a build that was given no list. */
const namesIn = (sources: IconSource[]): string[] => {
  const found = new Set<string>()
  for (const { directory, suffix = '' } of sources) {
    if (!existsSync(directory)) {
      continue
    }
    for (const file of readdirSync(directory)) {
      if (!file.endsWith('.svg')) {
        continue
      }
      const bare = file.slice(0, -'.svg'.length)
      if (suffix === '' || bare.endsWith(suffix)) {
        found.add(suffix === '' ? bare : bare.slice(0, -suffix.length))
      }
    }
  }
  return [...found].sort()
}

/** The one file a name resolves to, or a refusal naming what went wrong. */
const sourceFor = (slug: string, sources: IconSource[]): string => {
  const candidates = sources
    .map(({ directory, suffix = '' }) => join(directory, `${slug}${suffix}.svg`))
    .filter((file) => existsSync(file))

  /* **Every match, not the first.** See the note at the top: a name in two
     sources is a decision nothing would report. */
  if (candidates.length > 1) {
    throw new Error(
      `icons: "${slug}" resolves to ${candidates.length} files, and the order between them is a ` +
        `silent decision:\n  ${candidates.join('\n  ')}\n` +
        'Rename one, or name the sources in the order you mean.',
    )
  }
  if (candidates.length === 0) {
    throw new Error(
      `icons: no SVG for "${slug}" in ${sources.map((one) => one.directory).join(', ')}`,
    )
  }
  return readFileSync(candidates[0] as string, 'utf8')
}

/** One glyph, read and optimized, as the module writes it. */
const drawn = (slug: string, sources: IconSource[]) => {
  const source = optimize(sourceFor(slug, sources), SVGO).data
  const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1] ?? '0 0 256 256'
  const content = source
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    /* The component supplies the accessible name, so a baked-in one would
       announce twice and could not be localized. */
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { camel: camel(slug), content, slug, viewBox }
}

/**
 * Writes the module, and says how many glyphs are in it.
 *
 * @throws where a name resolves to no file, or to more than one.
 */
export function build(options: BuildOptions): number {
  const { index = false, out, sources, typeImport = '@fusion.dev/helix-icons' } = options
  const names = options.names ?? namesIn(sources)
  const entries = names.map((slug) => drawn(slug, sources))

  const body = entries
    .map(
      ({ camel: name, content, slug, viewBox }) =>
        `export const ${name}: HelixIcon = {\n  content: '${content.replace(/'/g, "\\'")}',\n  name: '${slug}',\n  viewBox: '${viewBox}',\n}`,
    )
    .join('\n\n')
  const record = entries.map(({ camel: name }) => `  [${name}.name]: ${name},`).join('\n')

  writeFileSync(
    out,
    `// Generated by @fusion.dev/helix-icons. Do not edit.
import type { HelixIcon } from '${typeImport}'

${body}
${
  index
    ? `
/** Every icon, by name, for lookup from a \`name\` attribute. */
export const icons: Record<string, HelixIcon> = {
${record}
}
`
    : ''
}`,
  )
  return entries.length
}
