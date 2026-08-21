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
 *   `docs/19-queue.md`, `helix/styles/src/tokens.css`. A path that starts
 *   somewhere else is illustrative rather than a claim and is left alone.
 * - A backticked `bun run <script>`, against the nearest `package.json` and
 *   every one above it, since a package names its own scripts.
 * - A backticked `check:<name>`, likewise.
 *
 * A bare word in backticks is not checked, because it is usually a property, a
 * CSS value or a piece of English, and guessing which would report the prose
 * that is doing its job.
 *
 * Run with `bun run check:references` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['helix', 'cortex', 'tooling', 'docs', 'site/ui/lib', 'site/ui/app']
const EXTENSIONS = /\.(css|html|json|md|mjs|rs|toml|ts|tsx|txt)$/
const SOURCE = /\.(css|mjs|ts|tsx)$/

/* Scripts from the nearest `package.json` and every one above it, not the root
   alone. The icons package names its own build script in a comment and is right
   to: the script is in its own manifest, and a check reading only the root
   reported the one comment in the repo that had looked it up.
 *
 * This paragraph originally quoted that script, and the check reported itself:
 * a file in `tooling/scripts` cannot run it, and prose *about* a reference
 * looks exactly like a reference. Which is the honest limit of the whole idea
 * and the reason it only reads three narrow shapes. */
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
const walk = (dir) => {
  if (!existsSync(dir)) {
    return
  }
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
    } else if (SOURCE.test(entry) && !entry.endsWith('.css.ts')) {
      files.push(path)
    }
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

const unique = [...new Set(problems)]
if (unique.length > 0) {
  console.error(
    `Comments naming what is not there (${unique.length}):\n\n  ${unique.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`references: ${files.length} files, every path and script a comment names exists`)
