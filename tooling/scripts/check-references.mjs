#!/usr/bin/env node
/**
 * Checks that a comment naming a path or a script names one that exists.
 *
 * **A stale comment is worse than no comment, because it is believed.** Prose
 * is the one part of a file nothing compiles, so a reference in it survives the
 * rename that invalidated it and goes on telling every later reader something
 * that stopped being true. `Stat`'s stylesheet described a `detail` slot for
 * months, and a spec three files away existed specifically to say there was no
 * such slot.
 *
 * This is the mechanical half of that problem, which is the half a check can
 * hold: a backticked path, a `bun run` script, or a `check:*` name is either
 * there or it is not, and asking is free. The other half is whether a comment
 * carries the reasoning or restates the code, and no script decides that.
 *
 * **What is checked.** Inside comments only, and only three shapes, all chosen
 * because a false positive is worse than a miss here:
 *
 * - A backticked path rooted at the repository, with a known extension:
 *   `fusion/docs/19-queue.md`, `helix/styles/src/tokens.css`. A path that starts
 *   somewhere else is illustrative rather than a claim and is left alone.
 * - A backticked `bun run <script>`, against the nearest `package.json` and
 *   every one above it, since a package names its own scripts.
 * - A backticked `check:<name>`, likewise.
 *
 * A bare word in backticks is not checked, because it is usually a property, a
 * CSS value or a piece of English, and guessing which would report the prose
 * that is doing its job.
 *
 * **And a markdown link target, which is the fourth shape.** The three above all
 * live inside comments, and markdown prose is not a comment, so a link written
 * as `[the guide](../guides/theming.md)` is invisible to every one of them. The
 * usual slip is naming `theming.md` where the file is `theming.mdx`. Resolved
 * relative to the file that holds the link, which is how a reader follows it,
 * and only for targets that look like a repository file: anything with a
 * scheme, an anchor alone, or a bare word is left alone.
 *
 * Run with `bun run check:prose:references` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

/* The trees that are walked, and the prefixes that make a backticked path a
   claim about this repository rather than an illustration. */
const ROOTS = ['helix', 'cortex', 'tooling', 'fusion', 'fusion/site']

/* The repository's own top-level files, checked without descending. A root file
   is where a reader starts, which makes it the worst place to be unchecked:
   `AGENTS.md` linked a file that had moved and nothing saw it, because every
   path this check scanned was inside a package.

   Listed rather than walked from `.`, because walking the root would scan every
   package a second time and descend into `target`, which is 2.4GB of Rust build
   output. */
const ROOT_FILES = readdirSync('.').filter(
  (entry) => /\.(md|json|ts|mjs)$/.test(entry) && statSync(entry).isFile(),
)
const EXTENSIONS = /\.(css|html|json|md|mjs|rs|toml|ts|tsx|txt)$/
const SOURCE = /\.(css|mjs|ts|tsx)$/
const PROSE = /\.mdx?$/

/* Scripts from the nearest `package.json` and every one above it, not the root
   alone. The icons package names its own build script in a comment and is right
   to: the script is in its own manifest, and a check reading only the root
   reported the one comment in the repo that had looked it up.

   Prose *about* a reference looks exactly like a reference, so quoting a script
   the file cannot run makes this check report itself. That is the honest limit
   of the idea, and the reason it reads only three narrow shapes. */
const scriptsFor = (file) => {
  const found = new Set()
  const parts = file.split('/')
  for (let depth = parts.length - 1; depth > 0; depth -= 1) {
    const manifest = join(...parts.slice(0, depth), 'package.json')
    if (existsSync(manifest)) {
      for (const name of Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).scripts ?? {})) {
        found.add(name)
      }
    }
  }
  for (const name of Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {})) {
    found.add(name)
  }
  return found
}

const files = []
/* Markdown is walked into its own list rather than into `files`, because the
   comment scan above has nothing to say about it and counting it there would
   make the success line claim a corpus it had not read. */
const prose = []
const walk = (dir) => {
  if (!existsSync(dir)) {
    return
  }
  for (const entry of readdirSync(dir)) {
    if (
      entry === 'node_modules' ||
      entry === 'dist' ||
      entry === 'target' ||
      entry.startsWith('.')
    ) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
    } else if (SOURCE.test(entry) && !entry.endsWith('.css.ts')) {
      files.push(path)
    } else if (PROSE.test(entry)) {
      prose.push(path)
    }
  }
}
for (const file of ROOT_FILES) {
  if (SOURCE.test(file) && !file.endsWith('.css.ts')) {
    files.push(file)
  } else if (PROSE.test(file)) {
    prose.push(file)
  }
}

for (const root of ROOTS) {
  walk(root)
}

/** Every comment in a file, as text. */
const comments = (source) => [
  ...[...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => match[0]),
  ...[...source.matchAll(/\/\/[^\n]*/g)].map((match) => match[0]),
]

const problems = []
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const scripts = scriptsFor(file)
  for (const comment of comments(source)) {
    for (const [, path] of comment.matchAll(/`([a-z][\w./-]*\/[\w.-]+)`/gi)) {
      /* Rooted at the repository, so an illustrative path is left alone. The
         cem package's docs describe the output it avoids by naming
         `src/card/root/card-root.ts`, which is not a file and is not meant to
         be one; a check that read every slashed string as a claim reported it. */
      if (
        ROOTS.some((root) => path.startsWith(`${root.split('/')[0]}/`)) &&
        EXTENSIONS.test(path) &&
        !existsSync(path)
      ) {
        problems.push(`${file}: names \`${path}\`, which is not there.`)
      }
    }
    for (const [, script] of comment.matchAll(/`bun run ([\w:]+)`/g)) {
      if (!scripts.has(script)) {
        problems.push(`${file}: names \`bun run ${script}\`, which package.json does not have.`)
      }
    }
    for (const [, script] of comment.matchAll(/`(check:[\w-]+)`/g)) {
      if (!scripts.has(script)) {
        problems.push(`${file}: names \`${script}\`, which package.json does not have.`)
      }
    }
  }
}

/* Markdown links, resolved the way a reader follows them: relative to the file
   holding the link rather than to the repository. */
for (const file of prose) {
  const from = dirname(file)
  /* Inline code spans are stripped first, because a link inside one is an
     illustration of the shape rather than a link: `12-ai-native-web.md`
     describes the format of an `llms.txt` line as `- [Title](url.md)`, and
     `url.md` is not a file anybody meant to exist. */
  const text = readFileSync(file, 'utf8').replace(/`[^`\n]*`/g, '')
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const path = target.split('#')[0]
    if (path === '' || /^[a-z]+:/i.test(path) || !EXTENSIONS.test(path)) {
      continue
    }
    if (!existsSync(join(from, path))) {
      problems.push(`${file}: links to \`${target}\`, which is not there.`)
    }
  }
}

const unique = [...new Set(problems)]
if (unique.length > 0) {
  console.error(
    `Comments naming what is not there (${unique.length}):\n\n  ${unique.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `references: ${files.length} sources and ${prose.length} documents, every path a comment names and every markdown link resolves`,
)
