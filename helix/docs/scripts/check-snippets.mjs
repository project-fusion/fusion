#!/usr/bin/env bun
/**
 * Every name a documentation snippet imports from a Helix package exists there.
 *
 * **The imports, and not the snippets whole.** A snippet is a fragment: the
 * Theming guide's second one reads `deriveTheme({ brand })` with `brand`
 * declared nowhere, and that is how a page should read. What went wrong twice
 * was the import line. `theming.mdx` imported `deriveTheme` and `toCss` from
 * `@fusion.dev/helix-theme` after the package had become `initTheme`, once in
 * #217 and again in #423, and `intent-reference.mdx` imported `derive` the same
 * way. Run as written, each failed with "Export named 'toCss' not found", and no
 * check knew.
 *
 * So each fenced TypeScript or JavaScript block's imports from `@fusion.dev/*`
 * are written out as re-exports, which a compiler checks against the built
 * package's declarations without asking anything of the rest of the snippet: a
 * re-export cannot be unused, and `export type` keeps a type-only import a type.
 * A renamed or removed export, value or type, fails this.
 *
 * Under `.local`, the per-machine scratch, where the workspace's packages
 * resolve as they would for a reader who installed them.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT = resolve(HERE, '../content')
const ROOT = resolve(HERE, '../../..')
const OUT = join(ROOT, '.local/docs-snippets')

const FENCE = /```(?:ts|tsx|typescript|js|javascript|jsx)\n([\s\S]*?)```/g
/* A clause never holds a quote, which is what keeps one import from running
   on into the next where a block opens with an import of a stylesheet. */
const IMPORT =
  /import\s+(type\s+)?([^'";]*?)\s+from\s+'(@fusion\.dev\/[^']+)'|import\s+'(@fusion\.dev\/[^']+)'/g

/** One import, written as the re-export that checks it. */
const reexport = (typeOnly, clause, from) => {
  const keyword = typeOnly ? 'export type' : 'export'
  const parts = []
  const named = /\{([\s\S]*?)\}/.exec(clause)
  const rest = clause
    .replace(/\{[\s\S]*?\}/, '')
    .replace(/,/g, ' ')
    .trim()
  if (rest.startsWith('* as ')) {
    parts.push(`${keyword} * as ${rest.slice(5).trim()} from '${from}'`)
  } else if (rest !== '') {
    parts.push(`${keyword} { default as ${rest} } from '${from}'`)
  }
  if (named) {
    const names = named[1]
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
    if (names.length > 0) {
      parts.push(`${keyword} { ${names.join(', ')} } from '${from}'`)
    }
  }
  return parts
}

rmSync(OUT, { force: true, recursive: true })
mkdirSync(OUT, { recursive: true })

const written = new Map()
/* A stylesheet has no declarations for a compiler to check, so it is asked
   whether it resolves through the package's exports, which is what a bundler
   asks. */
const missing = []
for (const page of readdirSync(CONTENT).filter((name) => name.endsWith('.mdx'))) {
  const text = readFileSync(join(CONTENT, page), 'utf8')
  let block = 0
  for (const fence of text.matchAll(FENCE)) {
    block += 1
    const line = text.slice(0, fence.index).split('\n').length
    const lines = []
    for (const found of (fence[1] ?? '').matchAll(IMPORT)) {
      if (found[4]?.endsWith('.css')) {
        try {
          Bun.resolveSync(found[4], ROOT)
        } catch {
          missing.push(`helix/docs/content/${page}:${line}: '${found[4]}' does not resolve`)
        }
      } else if (found[4]) {
        lines.push(`import '${found[4]}'`)
      } else {
        lines.push(...reexport(Boolean(found[1]), found[2] ?? '', found[3] ?? ''))
      }
    }
    if (lines.length === 0) {
      continue
    }
    const file = `${page.replace(/\.mdx$/, '')}-${block}.ts`
    writeFileSync(join(OUT, file), `${lines.join('\n')}\n`)
    written.set(file, `helix/docs/content/${page}:${line}`)
  }
}

writeFileSync(
  join(OUT, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: { noEmit: true, noUnusedLocals: false, rootDir: '.', skipLibCheck: true },
      extends: '../../tsconfig.package.json',
      include: ['*.ts'],
    },
    null,
    2,
  ),
)

const run = spawnSync('bunx', ['tsc', '-p', join(OUT, 'tsconfig.json')], {
  cwd: ROOT,
  encoding: 'utf8',
})
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim()
if (missing.length > 0) {
  console.error(missing.join('\n'))
}
if (run.status !== 0 || missing.length > 0) {
  /* Each error names the scratch file, which no reader has open, so it is
     said again with the page and the line the snippet starts on. */
  const said = output
    .split('\n')
    .map((one) => {
      const file = /docs-snippets\/([^(:]+\.ts)/.exec(one)?.[1]
      return file && written.has(file)
        ? `${written.get(file)}: ${one.replace(/^.*?error /, 'error ')}`
        : one
    })
    .join('\n')
  if (run.status !== 0) {
    console.error(said)
  }
  console.error(
    `snippets: ${written.size} blocks import from Helix, and what is named above does not exist`,
  )
  process.exit(1)
}
console.log(`snippets: every name ${written.size} documentation blocks import from Helix exists`)
