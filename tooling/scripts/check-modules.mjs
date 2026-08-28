#!/usr/bin/env node
/**
 * Refuses a plain stylesheet that selects a class only a CSS module defines.
 *
 * **A CSS module rewrites its class names, so the source name is not the name
 * in the document.** `aura.css` carried
 * `:root:has(.auraStage) .siteFooter { display: none }` from the day the page
 * was written and it had never once matched: `.siteFooter` is the source name
 * of a rule in `chrome.module.css`, the element carries
 * `chrome-module__sKhELq__siteFooter`, and the only thing able to select that is
 * `styles.siteFooter` from inside a module. Measured on the route before the
 * fix, the footer was `display: block` and 84 pixels tall under a stage that is
 * already `100svh`, on a page whose own stylesheet had been asking for it to be
 * hidden the whole time.
 *
 * **It is the same fault as a `[part=]` selector for a part nothing renders**,
 * which `check:css:selectors` already catches, and the module boundary makes it
 * worse: the rule reads correctly, the name is spelled correctly, the name it
 * wants is right there in a sibling file, and there is no error, no warning and
 * no clue beyond the feature not happening.
 *
 * **What makes a class legitimate is markup that writes it out**, not another
 * stylesheet mentioning it. `aura.css` styles `.auraStage` and the page carries
 * `className="auraStage"` as a literal, so that name reaches the document
 * exactly as written and the rule matches. `.siteFooter` is reached only
 * through `styles.siteFooter` inside a module, so it never appears literally
 * anywhere and no plain rule can ever see it.
 *
 * So the test is the row's own words: a class a module declares and **nothing
 * writes out**. Asking instead whether some other plain sheet mentions the name
 * fails on the exact case this exists for, since the offending rule
 * `.auraProbe .siteFooter` mentions the name itself and would clear itself.
 * Found by probing the first version with the fault it was written for, which
 * passed.
 *
 * Run with `bun run check:css:modules`. `check:api:attributes` is the neighbor, both
 * being a consumer reaching for a name it was never entitled to use.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['site', 'helix']
const IGNORED = new Set(['dist', 'node_modules', '.next', '.next-dev', '.turbo', 'public'])

const sheets = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sheets(path, found)
    } else if (path.endsWith('.css')) {
      found.push(path)
    }
  }
  return found
}

/* Comments hold prose about class names, including this check's own examples,
   and a name inside one selects nothing. */
const withoutComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every class this sheet declares a rule for. */
const declares = (code) =>
  new Set(
    [...withoutComments(code).matchAll(/(?:^|[\s,>+~({])\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]),
  )

const all = ROOTS.flatMap((root) => sheets(root))
const modules = all.filter((path) => path.endsWith('.module.css'))
const plain = all.filter((path) => !path.endsWith('.module.css'))

/** Where a class is declared by a module, so the document never carries it raw. */
const rewritten = new Map()
for (const path of modules) {
  for (const name of declares(readFileSync(path, 'utf8'))) {
    if (!rewritten.has(name)) {
      rewritten.set(name, path)
    }
  }
}

/** Every source file that can write a class into the document. */
const markup = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      markup(path, found)
    } else if (/\.(tsx?|html|mdx)$/.test(path)) {
      found.push(path)
    }
  }
  return found
}

/* Every class any source writes out literally, which is what reaches the DOM
   under the name the author typed. `styles.foo` is deliberately not counted:
   that is the rewritten form and is the whole reason a plain rule cannot see
   it. */
const literal = new Set()
for (const root of ROOTS) {
  for (const path of markup(root)) {
    const code = readFileSync(path, 'utf8')
    for (const match of code.matchAll(/\bclass(?:Name)?=(?:"([^"]*)"|'([^']*)')/g)) {
      for (const name of (match[1] ?? match[2] ?? '').split(/\s+/)) {
        if (name) {
          literal.add(name)
        }
      }
    }
  }
}

const problems = []
let checked = 0
for (const path of plain) {
  for (const name of declares(readFileSync(path, 'utf8'))) {
    checked += 1
    if (literal.has(name)) {
      continue
    }
    const owner = rewritten.get(name)
    if (owner !== undefined) {
      problems.push(
        `${path}: selects \`.${name}\`, which only \`${owner}\` declares. A CSS module ` +
          `rewrites its class names, so the document carries a hashed one and this rule ` +
          `matches nothing, silently. Select it by an attribute the bundler cannot rename, ` +
          `or move the rule inside the module and use \`styles.${name}\`.`,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Plain rules selecting a module's class (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(`modules: ${checked} class selectors in plain stylesheets, every one able to match`)
