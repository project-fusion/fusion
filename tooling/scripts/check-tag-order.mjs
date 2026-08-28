#!/usr/bin/env node
/**
 * Holds every component's class JSDoc to one order, and sorts what is a list.
 *
 * **The order was real before it was written down, which is the state a
 * convention decays from.** Measured across the 246 class JSDoc blocks on
 * 27 Aug 2026: the metadata prefix is unanimous, `@summary`, `@description`,
 * `@since`, `@status`, `@category`, `@groups`, `@aliases`, `@documentation`, in
 * that sequence, in every block that carries them. The API groups were not.
 * `@slot` came before `@csspart` 115 times and after it 3, and `@cssproperty`
 * came last 17 times against 2, so both of those are the corpus stating a rule.
 * `@csspart` against `@event` split 38 to 36, which is not a convention, it is
 * a coin landing. That one was decided rather than derived, and the decision is
 * the constant below.
 *
 * **Within a group the entries were in no order at all.** 62 files held a tag
 * list of four or more that was not alphabetical, which reads as deliberate
 * until the list is long enough to search, and then it reads as nothing.
 * `video-root.ts` is the case that argues for the check rather than another
 * sweep: it declares 48 parts, and its `captions-menu-*` family had drifted
 * into three separate runs with `fullscreen` and the whole `overflow-*` set
 * between them. Nothing was wrong with any line of it. The parts had simply
 * been appended in the order they were built over some months, which is what
 * every unsorted list is, and the only reader who could tell was one who
 * already knew the answer.
 *
 * **A docs page is generated from this order.** The manifest carries the tags
 * in source order and `bun run reference` writes them out that way, so an
 * unsorted block is not untidy source, it is a published API table a reader
 * scans and does not find a part in. That is the whole argument for judging it
 * here rather than leaving it to review.
 *
 * **Only blocks carrying `@summary` are touched**, which is this repository's
 * marker for a component's class JSDoc. A member's JSDoc uses `@internal`,
 * `@param` and `@reference`, whose order is the order of the thing they
 * describe and not alphabetical, and none of them appears beside a `@summary`.
 *
 * Run `bun run tag-order` to rewrite, and `bun run check:tag-order` to fail
 * when a block is left out of order. `verify` runs the check, beside
 * `check:dialect`, for the same reason and not in the pre-push hook: nothing
 * here is a generated file, so a stale one cannot turn a push red.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The tag order, one array per section, and a blank line between sections.
 *
 * Tags inside a section sit together with no blank line, which is what makes
 * the five metadata tags read as one block rather than five statements.
 *
 * The sequence is the corpus's own except for `@event` against `@csspart`,
 * which the corpus split almost evenly and which is settled here: slots and
 * events are what a consumer writes markup against, parts and custom properties
 * are what they write CSS against, and the two pairs are worth not interleaving.
 */
const SECTIONS = [
  ['summary'],
  ['description'],
  ['since', 'status', 'category', 'groups', 'aliases', 'documentation'],
  ['slot'],
  ['event'],
  ['csspart'],
  ['cssproperty'],
]

/**
 * The tags whose entries are a list, and so are sorted within their section.
 *
 * The metadata tags are not here because each appears once, and `@description`
 * is prose whose paragraphs are an argument in sequence.
 */
const SORTED = new Set(['csspart', 'cssproperty', 'event', 'slot'])

const ROOTS = ['cortex', 'helix', 'site']

const IGNORED = new Set([
  '.next',
  '.next-dev',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
  'public',
  'target',
  'wasm',
  'worktrees',
])

const GENERATED = /(\.generated\.\w+|\.d\.ts|\.spec\.tsx?)$/

const files = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      files(path, found)
    } else if (/\.tsx?$/.test(path) && !GENERATED.test(path)) {
      found.push(path)
    }
  }
  return found
}

const sectionOf = (tag) => {
  const index = SECTIONS.findIndex((section) => section.includes(tag))
  return index === -1 ? SECTIONS.length : index
}

/**
 * The name an entry sorts under, which is not in the same place for every tag.
 *
 * `@event` carries a brace-wrapped type before its name and the others do not,
 * and the default slot is written `@slot - description` with no name at all. It
 * sorts first, which is where a reader looks for it: it is the slot a component
 * has before it has any other.
 */
const nameOf = (tag, line) => {
  const body = line.replace(/^\s*\*\s*@\w+\s*/, '')
  if (tag === 'event') {
    return (/^(?:\{[^}]*\}\s+)?(\S+)\s+-/.exec(body) ?? ['', ''])[1] ?? ''
  }
  return (/^(\S+)\s+-/.exec(body) ?? ['', ''])[1] ?? ''
}

const compare = (left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' })

const blank = (line) => /^\s*\*?\s*$/.test(line)

/**
 * Splits a block into its leading prose and one entry per tag.
 *
 * An entry owns every line after its tag until the next one, so a wrapped
 * description and the blank line inside a multi-paragraph `@description` both
 * travel with the tag that opened them. Trailing blanks are dropped because the
 * rebuild puts the separators back, and keeping them would double every one.
 */
const parse = (inner) => {
  const lines = inner.split('\n')
  if (lines.length > 0 && lines.at(-1).trim() === '') {
    lines.pop()
  }
  const lead = []
  const entries = []
  for (const line of lines) {
    const tag = /^\s*\*\s*@(\w+)\b/.exec(line)
    if (tag) {
      entries.push({ lines: [line], tag: tag[1] })
    } else if (entries.length > 0) {
      entries.at(-1).lines.push(line)
    } else {
      lead.push(line)
    }
  }
  for (const entry of entries) {
    while (entry.lines.length > 1 && blank(entry.lines.at(-1))) {
      entry.lines.pop()
    }
  }
  while (lead.length > 0 && blank(lead.at(-1))) {
    lead.pop()
  }
  return { entries, lead }
}

const rebuild = (indent, lead, entries) => {
  const ordered = entries
    .map((entry, index) => ({ ...entry, index, section: sectionOf(entry.tag) }))
    .sort(
      (left, right) =>
        left.section - right.section ||
        (left.tag === right.tag && SORTED.has(left.tag)
          ? compare(nameOf(left.tag, left.lines[0]), nameOf(right.tag, right.lines[0]))
          : 0) ||
        left.index - right.index,
    )
  const out = []
  let previous = null
  for (const entry of ordered) {
    if (previous !== null && entry.section !== previous) {
      out.push(`${indent} *`)
    }
    out.push(...entry.lines)
    previous = entry.section
  }
  return `${indent}/**\n${[...lead, ...out].join('\n')}\n${indent} */`
}

/**
 * What is wrong with a block, said in the terms the author wrote it in.
 *
 * A diff would be shorter to produce and useless to read: the fix is almost
 * always one tag in the wrong place, and a reader needs to be told which one
 * rather than shown fourteen moved lines. Ordering faults are named first
 * because a spacing fault beside one is a consequence of it.
 */
const faults = (entries) => {
  const found = []
  for (let index = 0; index < entries.length - 1; index++) {
    const [here, next] = [entries[index], entries[index + 1]]
    if (sectionOf(here.tag) > sectionOf(next.tag)) {
      found.push(`\`@${next.tag}\` comes after \`@${here.tag}\`, and belongs before it`)
      continue
    }
    if (here.tag !== next.tag || !SORTED.has(here.tag)) {
      continue
    }
    const [first, second] = [nameOf(here.tag, here.lines[0]), nameOf(next.tag, next.lines[0])]
    if (compare(first, second) > 0) {
      found.push(`\`@${here.tag} ${second}\` comes after \`${first}\`, and sorts before it`)
    }
  }
  return found
}

const write = process.argv.includes('--write')
const problems = []
let blocks = 0
let rewritten = 0

for (const path of ROOTS.flatMap((root) => files(root))) {
  const before = readFileSync(path, 'utf8')
  if (!before.includes('@summary')) {
    continue
  }
  let touched = false
  const after = before.replace(
    /^([ \t]*)\/\*\*\n([\s\S]*?)^[ \t]*\*\//gm,
    (whole, indent, inner, offset) => {
      if (!/^\s*\*\s*@summary\b/m.test(inner)) {
        return whole
      }
      const { entries, lead } = parse(inner)
      if (entries.length === 0) {
        return whole
      }
      blocks += 1
      const next = rebuild(indent, lead, entries)
      if (next === whole) {
        return whole
      }
      touched = true
      if (!write) {
        const line = before.slice(0, offset).split('\n').length
        const said = faults(entries)
        for (const fault of said.length > 0
          ? said
          : ['the blank lines between tag groups are off']) {
          problems.push(`${path}:${line}: ${fault}.`)
        }
      }
      return next
    },
  )
  if (touched && write) {
    writeFileSync(path, after)
    rewritten += 1
  }
}

if (write) {
  console.log(`tag order: ${rewritten} files rewritten, ${blocks} class JSDoc blocks read`)
  process.exit(0)
}

if (problems.length > 0) {
  console.error(`Class JSDoc out of order (${problems.length}):\n`)
  for (const problem of problems.slice(0, 40)) {
    console.error(`  ${problem}`)
  }
  if (problems.length > 40) {
    console.error(`\n  ...and ${problems.length - 40} more. Run \`bun run tag-order\`.`)
  }
  process.exit(1)
}

console.log(`tag order: ${blocks} class JSDoc blocks, every tag in sequence and every list sorted`)
