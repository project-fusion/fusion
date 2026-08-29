#!/usr/bin/env node
/**
 * Holds the documentation to the API that exists.
 *
 * **A docs page naming a property the build refuses is worse than no page.** A
 * reader follows it, writes what it says, and the failure arrives from a check
 * they have never heard of, in a repository they are not in. Everything else
 * here is verified against something: parts against what renders, hooks against
 * what reads them, events against what dispatches them, tokens against what
 * declares them. Prose was the one surface with no such tie, and a rename that
 * swept the code had nothing to make it sweep the pages.
 *
 * Seven things are held, and they are the seven a page can get wrong while
 * reading perfectly:
 *
 * - **A tag.** `<helix-disclosure>` in an example is an element that will not
 *   upgrade, and it looks exactly like one that will. In a selector too:
 *   `helix-disclosure::part(trigger)` is the form an override example takes.
 * - **A token, and a per-component hook.** `--helix-color-border-subtle`
 *   resolves to nothing and the property silently falls back, which is the same
 *   failure `check:css:tokens` already catches in CSS and could not see in prose. A
 *   hook is held only where its prefix is a real family, because a page
 *   legitimately shows a consumer's own properties: `--site-cta-inline-size` and
 *   `--brand-blue-500` are the reader's to name and not ours to verify.
 * - **An event.** A name in an `addEventListener` or an `onhelix-` prop that
 *   nothing dispatches is a handler that never runs.
 * - **An exported name.** A mixin, an element class or a helper named in a code
 *   fence has to be something the workspace exports.
 * - **Anything said to be dispatched.** An invented event name carrying none of
 *   this library's prefixes slips every rule above, so the verb is what catches
 *   it: a sentence saying a thing is dispatched has to name a thing that is.
 * - **A subpath, resolved rather than assumed.** A package name existing says
 *   nothing about a path inside it. An export map answers a subpath through a
 *   wildcard that can rewrite it into a directory under `dist`, so the path a
 *   page recommends may name a file that is not there, and the only honest test
 *   is Node's own resolver.
 *
 *   That pattern is described rather than quoted here, because the wildcard and
 *   the slash written literally close this comment block.
 * - **A package.** A package name is the cheapest of these to verify, and a docs
 *   page counting a package the workspace does not have reads perfectly.
 *
 * **What it deliberately does not check is English.** The word "appearance" in a
 * sentence about how something looks is not an API reference, so only backticked
 * and bracketed forms count. A check that read prose would fail on
 * `overriding-a-component.mdx` saying "the whole styled appearance is built on",
 * which is correct English about a real thing.
 *
 * **And it reads the historical case as historical.** `visual-axes.mdx` is the
 * page that explains why `appearance` was removed, so it names it four times and
 * must. A mention inside a sentence that says it is gone is allowed, which is
 * narrower than exempting the page: the page can still be wrong about anything
 * else.
 *
 * Run with `bun run check:prose:documented` (also part of `bun run verify`), after
 * `bun run analyze`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Everything in this repository that tells somebody what the API is.
 *
 * **The published pages and the files that instruct an agent, which is the same
 * problem twice.** `.claude/rules/helix.md` and the skills beside it are read by
 * a machine that then writes code, and they drift harder than the documentation
 * does.
 *
 * A page that is wrong misleads a reader who can push back. A rule that is wrong
 * is read by something that cannot, and it is read first.
 */
const pages = () => {
  const found = []
  for (const domain of readdirSync(ROOT, { withFileTypes: true })) {
    if (!domain.isDirectory()) {
      continue
    }
    const content = join(ROOT, domain.name, 'docs', 'content')
    if (!existsSync(content)) {
      continue
    }
    for (const file of readdirSync(content)) {
      if (file.endsWith('.mdx')) {
        found.push(join(content, file))
      }
    }
  }

  const rules = join(ROOT, '.claude', 'rules')
  if (existsSync(rules)) {
    for (const file of readdirSync(rules)) {
      if (file.endsWith('.md')) {
        found.push(join(rules, file))
      }
    }
  }
  const skills = join(ROOT, '.claude', 'skills')
  if (existsSync(skills)) {
    for (const skill of readdirSync(skills, { withFileTypes: true })) {
      const card = join(skills, skill.name, 'SKILL.md')
      if (skill.isDirectory() && existsSync(card)) {
        found.push(card)
      }
    }
  }
  const root = join(ROOT, 'AGENTS.md')
  if (existsSync(root)) {
    found.push(root)
  }
  return found
}

/** Tags and event names, out of every manifest in the workspace. */
const fromManifests = () => {
  const tags = new Set()
  const events = new Set()
  const hooks = new Set()
  for (const domain of readdirSync(ROOT, { withFileTypes: true })) {
    if (!domain.isDirectory()) {
      continue
    }
    for (const pkg of readdirSync(join(ROOT, domain.name), { withFileTypes: true }).filter((one) =>
      one.isDirectory(),
    )) {
      const manifest = join(ROOT, domain.name, pkg.name, 'custom-elements.json')
      if (!existsSync(manifest)) {
        continue
      }
      const json = JSON.parse(readFileSync(manifest, 'utf8'))
      for (const module of json.modules ?? []) {
        for (const declaration of module.declarations ?? []) {
          if (declaration.tagName) {
            tags.add(declaration.tagName)
          }
          for (const event of declaration.events ?? []) {
            if (event.name) {
              events.add(event.name)
            }
          }
          for (const hook of declaration.cssProperties ?? []) {
            if (hook.name) {
              hooks.add(hook.name)
            }
          }
        }
      }
    }
  }
  return { events, hooks, tags }
}

/** Every package in the workspace, by the name its manifest declares. */
const fromPackages = () => {
  const names = new Set()
  for (const domain of readdirSync(ROOT, { withFileTypes: true }).filter((one) =>
    one.isDirectory(),
  )) {
    for (const pkg of readdirSync(join(ROOT, domain.name), { withFileTypes: true }).filter((one) =>
      one.isDirectory(),
    )) {
      const manifest = join(ROOT, domain.name, pkg.name, 'package.json')
      if (!existsSync(manifest)) {
        continue
      }
      const { name } = JSON.parse(readFileSync(manifest, 'utf8'))
      if (name) {
        names.add(name)
      }
    }
  }
  return names
}

/** Every semantic token, from the generated token set. */
const fromTokens = () => {
  const names = new Set()
  const file = join(ROOT, 'helix', 'styles', 'tokens.json')
  if (!existsSync(file)) {
    return names
  }
  for (const token of JSON.parse(readFileSync(file, 'utf8')).tokens ?? []) {
    names.add(token.name)
  }
  return names
}

/**
 * Every name the workspace exports, from its sources.
 *
 * Read out of the sources rather than out of `dist`, so this works on a clean
 * checkout and cannot report a stale build as a documentation error.
 */
const exported = () => {
  const names = new Set()
  const walk = (from) => {
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const path = join(from, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          walk(path)
        }
        continue
      }
      if (!entry.name.endsWith('.ts') || entry.name.includes('.spec.')) {
        continue
      }
      const text = readFileSync(path, 'utf8')
      for (const [, name] of text.matchAll(
        /export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|class|function|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
      )) {
        names.add(name)
      }
      for (const [, list] of text.matchAll(/export\s*\{([^}]*)\}/g)) {
        for (const part of list.split(',')) {
          const name = part
            .split(' as ')
            .pop()
            .trim()
            .replace(/^type\s+/, '')
          if (name) {
            names.add(name)
          }
        }
      }
    }
  }
  for (const domain of readdirSync(ROOT, { withFileTypes: true }).filter((one) =>
    one.isDirectory(),
  )) {
    for (const pkg of readdirSync(join(ROOT, domain.name), { withFileTypes: true }).filter((one) =>
      one.isDirectory(),
    )) {
      const src = join(ROOT, domain.name, pkg.name, 'src')
      if (existsSync(src)) {
        walk(src)
      }
    }
  }
  return names
}

const { events, hooks, tags } = fromManifests()
const tokens = fromTokens()
const packages = fromPackages()
/* Resolved from the repository root, which is where a consumer's `node_modules`
   sits in the workspace: asking from this script's own directory would answer for
   `tooling/` rather than for the packages. */
const { resolve } = createRequire(join(ROOT, 'package.json'))
const exports_ = exported()
const problems = []
let checked = 0

/* Nothing to hold the pages to. A workspace with no manifest has not been
   analyzed, and reporting every tag in every page as undeclared would be a
   check failing on its own missing input. */
if (tags.size === 0) {
  console.error('documented: no manifests found. Run `bun run analyze` first.')
  process.exit(1)
}

/**
 * A mention that says the thing does not work is allowed to name it.
 *
 * Two shapes. **Historical**: a sentence saying the thing was removed.
 * **Counter-example**: a sentence naming the wrong thing in order to warn about
 * it, which the rules files and the root `AGENTS.md` do deliberately, with
 * `onhelix-opne` as a typo that compiles clean and `HelixOpen` as an event
 * nobody dispatches.
 *
 * Those are the check firing on prose that is correct, so exempting them is not
 * a loosening. A check with permanent false positives is one people learn to
 * skip, and then it holds nothing at all.
 */
const HISTORICAL =
  /\b(was|were|used to|no longer|removed|refused|gone|deleted|instead of|rather than|gained|renamed|nobody|nothing|invented|never|typo|cannot)\b/i

/**
 * Whether the name is the object of an immediate negation: `not` then the name.
 *
 * Narrower than the list above, and it catches the shape that list cannot reach
 * without exempting the word "not" everywhere. Only the twenty characters in
 * front of the match, so a "not" earlier in the same sentence does not license a
 * name at the end of it.
 */
const NEGATED = (before) => /\b(not|never|no)\b[\s`'"(]*$/i.test(before.slice(-20))

for (const page of pages()) {
  const text = readFileSync(page, 'utf8')
  const where = page.slice(ROOT.length + 1)
  /** The sentence a match sits in, for the historical test. */
  const around = (at) => text.slice(Math.max(0, at - 220), at + 220)
  /** Whether a mention here is prose explaining that the thing is not real. */
  const explained = (at) => HISTORICAL.test(around(at)) || NEGATED(text.slice(0, at))

  /* In markup and in a selector. The second is how an override example is
     written. */
  for (const match of text.matchAll(
    /(?:<(helix-[a-z][a-z0-9-]*)|\b(helix-[a-z][a-z0-9-]*)(?=::|\s*\{))/g,
  )) {
    const tag = match[1] ?? match[2]
    checked += 1
    if (!tags.has(tag) && !explained(match.index)) {
      problems.push(`${where}: \`${tag}\` is not a tag any manifest declares.`)
    }
  }

  /* A hook whose prefix names a real family has to be one that family declares.
     Anything else is the consumer's own and is not ours to check. */
  const families = new Set([...tags].map((tag) => tag.replace(/^helix-/, '')))
  for (const match of text.matchAll(/--([a-z][a-z0-9-]*?)-([a-z][a-z0-9-]*)/g)) {
    const name = match[0]
    if (name.startsWith('--helix-') || name.startsWith('--_') || hooks.has(name)) {
      continue
    }
    const family = match[1]
    if (!families.has(family)) {
      continue
    }
    checked += 1
    if (!explained(match.index)) {
      problems.push(`${where}: \`${name}\` is not a hook \`${family}\` declares.`)
    }
  }

  for (const match of text.matchAll(/(--helix-[a-z][a-z0-9-]*)/g)) {
    checked += 1
    const name = match[1]
    /* Seeds and primitives are not semantic tokens and are documented on
       purpose: `--helix-seed-brand` is an input a consumer writes and
       `--_helix-*` is deliberately private. */
    if (name.startsWith('--helix-seed-') || tokens.has(name)) {
      continue
    }
    if (!explained(match.index)) {
      problems.push(`${where}: \`${name}\` is not a token \`@fusion.dev/helix-styles\` declares.`)
    }
  }

  for (const match of text.matchAll(/onhelix-([a-z][a-z0-9-]*)/g)) {
    checked += 1
    const name = `helix-${match[1]}`
    if (!events.has(name) && !explained(match.index)) {
      problems.push(`${where}: \`on${name}\` binds \`${name}\`, which nothing dispatches.`)
    }
  }

  for (const match of text.matchAll(/addEventListener\(\s*'(helix-[a-z0-9-]+)'/g)) {
    checked += 1
    if (!events.has(match[1]) && !explained(match.index)) {
      problems.push(`${where}: listens for \`${match[1]}\`, which nothing dispatches.`)
    }
  }

  /* A scoped name, and the subpath with it. The package half is a lookup and the
     subpath half is Node's resolver, because an export map is a program and
     reading one by eye is how a subpath that does not resolve gets believed. */
  for (const match of text.matchAll(
    /@(?:helix|cortex|fusion)-io\/[a-z][a-z0-9-]*(\/[A-Za-z0-9][\w./-]*)?/g,
  )) {
    const specifier = match[0]
    const name = specifier.split('/').slice(0, 2).join('/')
    checked += 1
    if (!packages.has(name)) {
      if (!explained(match.index)) {
        problems.push(`${where}: \`${name}\` is not a package in this workspace.`)
      }
      continue
    }
    if (specifier === name || explained(match.index)) {
      continue
    }
    try {
      resolve(specifier)
    } catch {
      problems.push(
        `${where}: \`${specifier}\` is not a path \`${name}\` exports. Its export map refuses it.`,
      )
    }
  }

  /* Whatever a page says is dispatched, whether or not it looks like ours. The
     verb is the tell: a sentence claiming something is sent has to name a thing
     that is sent. */
  for (const match of text.matchAll(/dispatch(?:es|ed|ing)?\s+`([A-Za-z][\w-]*)`/g)) {
    const name = match[1]
    checked += 1
    if (!events.has(name) && !exports_.has(name) && !explained(match.index)) {
      problems.push(`${where}: says \`${name}\` is dispatched, and nothing dispatches it.`)
    }
  }

  /* Only the names this library would own. A backticked `Promise` or `Set` is
     not ours to verify, and a bare capitalized word in prose is a sentence. */
  for (const match of text.matchAll(/`((?:Helix|Mixin|With)[A-Z][A-Za-z0-9]*)`/g)) {
    checked += 1
    if (!exports_.has(match[1]) && !explained(match.index)) {
      problems.push(`${where}: \`${match[1]}\` is not a name the workspace exports.`)
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Documentation naming API that does not exist (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `documented: ${checked} API references across ${pages().length} pages, every tag, token, event, hook, package, subpath and exported name real`,
)
