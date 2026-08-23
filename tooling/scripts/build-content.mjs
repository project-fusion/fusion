#!/usr/bin/env bun
/**
 * Inlines the site's MDX into a module, so nothing reads it at request time.
 *
 * `@fusion-io/site-content` is a folder of `.mdx` files and a typed registry,
 * shaped like the two documentation packages. The site compiles those files to
 * React and serves the same bytes as `/thesis.md`, and it must do both without
 * touching the filesystem: a path this app cannot statically scope traces the
 * whole repository into the server bundle, which Turbopack warns about on every
 * build and which took two commits to get rid of.
 *
 * So the files become a `Record<string, string>` here, the same arrangement
 * `pages.generated.ts` and `catalog.generated.json` already use. Committed, and
 * `--check` fails when it and the content disagree.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT = join(ROOT, 'site/content/content')
const OUT = join(ROOT, 'site/content/src/sources.generated.ts')

const slugs = readdirSync(CONTENT)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort()

const entries = slugs.map((slug) => {
  const source = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')
  /* A template literal rather than a quoted string: this is prose with
     newlines in it, and the alternative is one line of `\n` escapes nobody can
     read in a diff. Backticks and `${` are the only things to escape. */
  const escaped = source.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  /* Quoted only where it has to be. The formatter strips quotes from a key
     that is already a valid identifier, and a generated file it would rewrite
     is one that fails `biome ci` over bytes nobody typed. */
  const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : `'${slug}'`
  return `  ${key}: \`${escaped}\`,`
})

const generated = `/**
 * Every page's MDX, inlined by \`bun run content\`. Do not edit: the files in
 * \`content/\` are the source, and \`bun run check:content\` fails when this
 * module and they disagree.
 */
export const sitePageSources: Record<string, string> = {
${entries.join('\n')}
}
`

if (process.argv.includes('--check')) {
  if (readFileSync(OUT, 'utf8') !== generated) {
    console.error('content: sources.generated.ts is stale. Run `bun run content`')
    process.exit(1)
  }
  console.log(`content: ${slugs.length} pages, inlined and current`)
} else {
  writeFileSync(OUT, generated)
  console.log(`content: ${slugs.length} pages inlined`)
}
