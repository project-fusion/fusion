#!/usr/bin/env node
/**
 * A `/** *\/` block has to document the thing under it, or it documents nothing.
 *
 * Two doc blocks in a row is the shape: the first sits on the second rather
 * than on a member, so nothing reads it. It reaches no manifest, prints on no
 * reference page, and shows in no editor tooltip, while looking in the source
 * exactly like documentation that works. That is the whole problem with it: the
 * words are still there, so nobody deletes them and nobody notices they stopped
 * being attached to anything.
 *
 * Thirty of these were found across twenty-one files. `Slider.markerLabels`
 * shipped carrying another property's text, and `Menu` held two paragraphs
 * describing methods that had been removed. The fix each time is to demote the
 * stranded block to a plain `/* *\/`, which keeps every word where it is and
 * stops it claiming to describe the member below.
 *
 * **A blank line between them changes nothing**, which is why this looks past
 * whitespace. A reader sees two paragraphs and assumes the first belongs to the
 * file; the parser sees a block with no declaration after it.
 *
 * **A file header is not this, and exempting it is the whole subtlety.** A
 * module's own block sits above the first member's block by convention, so
 * every file with both looks like the fault from the pattern alone: the first
 * run reported thirty-eight, of which twenty-nine were headers doing their job.
 * A header is recognized by position rather than by a tag, because most of
 * ours carry no `@file` and adding one to sixty files to satisfy a check would
 * be the check deciding the house style. Nothing but a shebang and whitespace
 * above it means it is the file's.
 *
 * **It also catches a doc block at the end of a file**, where there is nothing
 * under it at all. That is rarer and the same fault.
 *
 * **The second shape is prose that sits after a tag**, which is dropped the
 * same way and is harder to see, because the block it is in does document
 * something. A JSDoc description ends at the first tag, so a paragraph written
 * below `@csspart` or `@documentation` reaches no manifest and prints on no
 * page while sitting in the middle of a block that works. Twenty-five were
 * found, of which sixteen were added the same day by the person writing this
 * check, which is the argument for it existing.
 *
 * A tag's own description may run to several lines and often does, so a
 * continuation is not this: the fault is a *new paragraph*, marked by a blank
 * comment line before it and text at the comment margin rather than indented
 * under a bullet. Without that distinction the same scan reported sixty-eight,
 * and forty-three were a tag's own words wrapping.
 *
 * Run with `bun run check:prose:orphans` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/* Every package that ships source, plus the scripts, which carry more prose per
   line than anything else here and are the likeliest place for a block to come
   adrift during an edit. */
const ROOTS = ['cortex', 'helix', 'site', 'tooling']

const IGNORED = new Set(['dist', 'node_modules', '.next', '.turbo', 'coverage'])

const sources = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sources(path, found)
      /* `jsx.d.ts` and `vue.d.ts` are written by the generator from the
         manifest, so a stranded block in one is a fault in the generator's
         template and not something anybody edits here. `.css.ts` is the same
         story one step over. */
    } else if (
      /\.(?:mjs|ts|tsx)$/.test(path) &&
      !path.endsWith('.css.ts') &&
      !path.endsWith('jsx.d.ts') &&
      !path.endsWith('vue.d.ts')
    ) {
      found.push(path)
    }
  }
  return found
}

/** The end of the block that opens at `at`, or -1 where it never closes. */
const blockEnd = (text, at) => {
  const close = text.indexOf('*/', at + 3)
  return close === -1 ? -1 : close + 2
}

const TERMINAL =
  /^\s*\*\s+@(since|status|category|aliases|documentation|slot|csspart|cssproperty|event|controlled)\b/
const PROSE_TAG = /^\s*\*\s+@(description|remarks|example)\b/
const BLANK = /^\s*\*\s*$/

/** Every paragraph in `text` that sits after a tag, by line number. */
const stranded = (text) => {
  const lines = text.split('\n')
  const found = []
  let inBlock = false
  let seen = false
  for (const [at, line] of lines.entries()) {
    if (/^\s*\/\*\*/.test(line)) {
      inBlock = true
      seen = false
    } else if (!inBlock) {
    } else if (line.includes('*/')) {
      inBlock = false
    } else if (PROSE_TAG.test(line)) {
      seen = false
    } else if (TERMINAL.test(line)) {
      seen = true
    } else if (
      seen &&
      BLANK.test(lines[at - 1] ?? '') &&
      /^\s*\* \S/.test(line) &&
      !/^\s*\* {2}/.test(line) &&
      !/^\s*\*\s+@/.test(line)
    ) {
      found.push(at + 1)
      seen = false
    }
  }
  return found
}

const problems = []
let held = 0

for (const root of ROOTS) {
  for (const file of sources(root)) {
    const text = readFileSync(file, 'utf8')
    for (const at of stranded(text)) {
      problems.push(
        `${file}:${at}: a paragraph sits after a tag, so it is not part of the description and ` +
          'reaches no manifest and no reference page. Move it above the first tag.',
      )
    }
    for (const open of text.matchAll(/\/\*\*/g)) {
      const end = blockEnd(text, open.index)
      if (end === -1) {
        continue
      }
      /* The file's own block, which belongs above the first member's and is not
         stranded. Recognized by having nothing but a shebang and whitespace
         above it. */
      const above = text
        .slice(0, open.index)
        .replace(/^#![^\n]*\n/, '')
        .trim()
      if (above === '') {
        held += 1
        continue
      }
      /* What follows, with whitespace skipped. A blank line between two blocks
         reads as separation and is not: the parser attaches a block to the next
         declaration whatever sits between them. */
      const after = text.slice(end).replace(/^\s*/, '')
      if (after === '') {
        problems.push(
          `${file}:${text.slice(0, open.index).split('\n').length}: a doc block ends the file, so ` +
            'there is nothing under it to document. Demote it to `/*` or move it onto a member.',
        )
        continue
      }
      if (!after.startsWith('/**')) {
        held += 1
        continue
      }
      problems.push(
        `${file}:${text.slice(0, open.index).split('\n').length}: a doc block sits directly on ` +
          'another one, so it documents nothing and reaches no manifest, no reference page and no ' +
          'tooltip. Demote it to `/*`, which keeps the words and drops the claim.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Doc blocks documenting nothing (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`orphans: ${held} doc blocks, every one attached to something under it`)
