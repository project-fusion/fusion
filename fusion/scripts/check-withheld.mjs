#!/usr/bin/env node
/**
 * Refuses a withheld name in any tracked file, and in the commits a push or a
 * pull request brings: their messages, and who wrote them.
 *
 * **Held as hashes, so the check names nothing.** The names are private
 * repositories, a former organization, a personal address. A list spelling
 * them would be the leak it exists to stop, published by the check itself, so
 * each is stored as the SHA-256 of its lowercase form and the text is hashed
 * and compared. What a reader of this file learns is how many there are.
 *
 * **Why it exists.** This history was rewritten twice to take such names out,
 * and the first rewrite was undone without anyone noticing: a file restored
 * from a copy made before it put the name straight back, and a clean working
 * tree said nothing, because the tree was clean. So the question is asked of
 * every file on every run, and of commit messages on the way in, which is the
 * one place a removal by path never reaches.
 *
 * **What counts as a name.** Text is cut into runs of letters, digits and
 * `.`, `_`, `@`, `/`, `+`, `-`, trimmed of punctuation at either end, and
 * each run is compared whole and in its `/`-separated parts, so an
 * `owner/repository` slug is caught by either half.
 *
 *   bun fusion/scripts/check-withheld.mjs                    every tracked file
 *   bun fusion/scripts/check-withheld.mjs --commits A..B     and those commits
 *   bun fusion/scripts/check-withheld.mjs --pushing          and what the push brings,
 *                                                            read from the hook's stdin
 *   bun fusion/scripts/check-withheld.mjs --hash 'a name'    the line to add for a new one
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

/** SHA-256 of each withheld name, lowercase. `--hash` prints a new one. */
const WITHHELD = new Set([
  '791abc73db84f78e09ea38d11b91a61813c5738b51f067f5c1ffba68beac59c5',
  'e43b4abec5a4bd022496a8337b8ed68d1a94aece788533fe720cf6cc4b974bc1',
  '94d94a0316ebfa312e28bc96f739906a73f62d05ac06a452b3d027937e0fa202',
  '5c7357f55d163181d28fac0676c2695ae911a4d4a7783bea0d32144f2e979cb3',
  'a2d1c9ca9fe0935b11502c52d44971018566d7cd4d9bc9e3e78e6bd65c8317a2',
  'e93a0023a8d4c4459db8d24eba3fa39ae1b2da596f37caf05285e0c97e15a106',
  'ff5a89c52c43749aa397529c5c8c4ab45f401ef8943204591158756a3e280392',
  'c5c501a853b7d046686fa225bc2480f352147e0ea1e75400d05033944dcd64f1',
  'cb4981c8b870a12fc3ac77cf811cf9ab7b37a35ce615be14e5d26e3a5987a770',
])

const hash = (text) => createHash('sha256').update(text.toLowerCase()).digest('hex')

if (process.argv.includes('--hash')) {
  const name = process.argv[process.argv.indexOf('--hash') + 1] ?? ''
  console.log(`  '${hash(name)}',`)
  process.exit(0)
}

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }).trim()

/** Whether any run of name-shaped text in `text` is withheld. */
const holds = (text) => {
  for (const run of text.split(/[^A-Za-z0-9._@/+-]+/)) {
    const token = run.replace(/^[._/+-]+|[._/+-]+$/g, '')
    if (token.length < 4) {
      continue
    }
    if (WITHHELD.has(hash(token))) {
      return true
    }
    if (token.includes('/')) {
      for (const part of token.split('/')) {
        if (part.length >= 4 && WITHHELD.has(hash(part))) {
          return true
        }
      }
    }
  }
  return false
}

const problems = []

/* Every tracked file, and its path, since a name can be a file's name. Binary
   files are skipped by the NUL test git itself uses. */
const files = git('ls-files', '-z').split('\0').filter(Boolean)
let read = 0
for (const file of files) {
  if (holds(file)) {
    problems.push(`${file}: its path holds a withheld name`)
    continue
  }
  let content
  try {
    content = readFileSync(join(root, file))
  } catch {
    continue
  }
  if (content.subarray(0, 8000).includes(0)) {
    continue
  }
  read += 1
  if (holds(content.toString('utf8'))) {
    problems.push(`${file}: holds a withheld name`)
  }
}

/** The commits in `range`: each message, and who wrote and committed it. */
const commits = (range) => {
  const log = git('log', '--format=%H%x1f%ae%x1f%ce%x1f%B%x1e', range)
  return log
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, author, committer, message] = entry.split('\x1f')
      return { author, committer, message, sha }
    })
}

/* The ranges a push brings, from the lines git hands a pre-push hook:
   `<local ref> <local sha> <remote ref> <remote sha>`. A new branch has an
   all-zero remote sha, so its range starts from `origin/main`. A deletion has
   an all-zero local sha and brings nothing. */
const pushed = () => {
  const zero = /^0+$/
  return readFileSync(0, 'utf8')
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 4 && !zero.test(parts[1]))
    .map(([, local, , remote]) =>
      zero.test(remote) ? `origin/main..${local}` : `${remote}..${local}`,
    )
}

const ranges = process.argv.includes('--pushing')
  ? pushed()
  : process.argv.includes('--commits')
    ? [process.argv[process.argv.indexOf('--commits') + 1]]
    : []
let messages = 0
for (const range of ranges) {
  for (const commit of commits(range)) {
    messages += 1
    const short = commit.sha.slice(0, 9)
    if (holds(commit.message)) {
      problems.push(`${short}: its message holds a withheld name`)
    }
    if (holds(commit.author) || holds(commit.committer)) {
      problems.push(`${short}: written or committed as a withheld address`)
    }
  }
}

if (problems.length > 0) {
  console.error(`withheld: ${problems.length} found, which this repository keeps out:\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error(
    '\n  Nothing here says which name it was, and that is deliberate. Remove it, or ask\n' +
      '  whoever keeps the list. A commit message is rewritten with `git commit --amend`\n' +
      '  or a rebase; an address, by committing with the right one.',
  )
  process.exit(1)
}
console.log(
  `withheld: ${read} files${ranges.length > 0 ? ` and ${messages} commits` : ''} read, ` +
    `none holding any of ${WITHHELD.size} withheld names`,
)
