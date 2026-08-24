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
 * It was written after an end-to-end read found four of exactly that, all from
 * one rename. `appearance` is refused outright by `check:axes`, and `tiers.mdx`
 * taught it three times over: in the package table, in the prose about what the
 * styled tier owns, and in the code sample a reader would copy. The same page
 * named a `WithOpen` mixin that does not exist, a `disclosure` family that does
 * not exist, complete with file paths, and `@fires`, a tag this library has
 * never used. None of that is a shape a grep would have been pointed at, which
 * is the argument for a check rather than another reading.
 *
 * Four things are held, and they are the four a page can get wrong while
 * reading perfectly:
 *
 * - **A tag.** `<helix-disclosure>` in an example is an element that will not
 *   upgrade, and it looks exactly like one that will. In a selector too:
 *   `helix-disclosure::part(trigger)` was the form the first version of this
 *   check missed, and it is the form an override example takes.
 * - **A token, and a per-component hook.** `--helix-color-border-subtle`
 *   resolves to nothing and the property silently falls back, which is the same
 *   failure `check:tokens` already catches in CSS and could not see in prose. A
 *   hook is held only where its prefix is a real family, because a page
 *   legitimately shows a consumer's own properties: `--site-cta-inline-size` and
 *   `--brand-blue-500` are the reader's to name and not ours to verify.
 * - **An event.** A name in an `addEventListener` or an `onhelix-` prop that
 *   nothing dispatches is a handler that never runs.
 * - **An exported name.** A mixin, an element class or a helper named in a code
 *   fence has to be something the workspace exports.
 * - **Anything said to be dispatched.** `SourceChange` was named as the sandbox's
 *   coordination event in this page, in the rules file, and in two JSDoc blocks
 *   that carry it into the manifest and from there into `jsx.d.ts` and
 *   `vue.d.ts`. Nothing has ever dispatched it: the event is `helix-change`. It
 *   slipped the rule above because it carries none of this library's prefixes,
 *   so the verb is what catches it instead.
 * - **A package.** `@helix-io/react` was in the Tiers package table, counted
 *   among "five packages", two pages after the Introduction said there is no
 *   React package. The rules file went further and documented regenerating
 *   wrappers in a `helix/react` that has never been in the repository. A package
 *   name is the cheapest of these to verify and was the one thing the first
 *   version of this check could not see.
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
 * Run with `bun run check:documented` (also part of `bun run verify`), after
 * `bun run analyze`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Every documentation page in the repository, by domain. */
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

/** A mention that says the thing is gone is allowed to name it. */
const HISTORICAL =
  /\b(was|were|used to|no longer|removed|refused|gone|deleted|instead of|rather than|gained|renamed)\b/i

for (const page of pages()) {
  const text = readFileSync(page, 'utf8')
  const where = page.slice(ROOT.length + 1)
  /** The sentence a match sits in, for the historical test. */
  const around = (at) => text.slice(Math.max(0, at - 220), at + 220)

  /* In markup and in a selector. The second is how an override example is
     written and is the form the first version of this check let through. */
  for (const match of text.matchAll(
    /(?:<(helix-[a-z][a-z0-9-]*)|\b(helix-[a-z][a-z0-9-]*)(?=::|\s*\{))/g,
  )) {
    const tag = match[1] ?? match[2]
    checked += 1
    if (!tags.has(tag) && !HISTORICAL.test(around(match.index))) {
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
    if (!HISTORICAL.test(around(match.index))) {
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
    if (!HISTORICAL.test(around(match.index))) {
      problems.push(`${where}: \`${name}\` is not a token \`@helix-io/styles\` declares.`)
    }
  }

  for (const match of text.matchAll(/onhelix-([a-z][a-z0-9-]*)/g)) {
    checked += 1
    const name = `helix-${match[1]}`
    if (!events.has(name) && !HISTORICAL.test(around(match.index))) {
      problems.push(`${where}: \`on${name}\` binds \`${name}\`, which nothing dispatches.`)
    }
  }

  for (const match of text.matchAll(/addEventListener\(\s*'(helix-[a-z0-9-]+)'/g)) {
    checked += 1
    if (!events.has(match[1]) && !HISTORICAL.test(around(match.index))) {
      problems.push(`${where}: listens for \`${match[1]}\`, which nothing dispatches.`)
    }
  }

  /* A scoped package name, which is the whole of this rule: a subpath is the
     package's business and `@helix-io/web/card` is verified by the export map
     rather than here. */
  for (const match of text.matchAll(/@(?:helix|cortex|fusion)-io\/[a-z][a-z0-9-]*/g)) {
    checked += 1
    if (!packages.has(match[0]) && !HISTORICAL.test(around(match.index))) {
      problems.push(`${where}: \`${match[0]}\` is not a package in this workspace.`)
    }
  }

  /* Whatever a page says is dispatched, whether or not it looks like ours. The
     verb is the tell: a sentence claiming something is sent has to name a thing
     that is sent. */
  for (const match of text.matchAll(/dispatch(?:es|ed|ing)?\s+`([A-Za-z][\w-]*)`/g)) {
    const name = match[1]
    checked += 1
    if (!events.has(name) && !exports_.has(name) && !HISTORICAL.test(around(match.index))) {
      problems.push(`${where}: says \`${name}\` is dispatched, and nothing dispatches it.`)
    }
  }

  /* Only the names this library would own. A backticked `Promise` or `Set` is
     not ours to verify, and a bare capitalised word in prose is a sentence. */
  for (const match of text.matchAll(/`((?:Helix|Mixin|With)[A-Z][A-Za-z0-9]*)`/g)) {
    checked += 1
    if (!exports_.has(match[1]) && !HISTORICAL.test(around(match.index))) {
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
  `documented: ${checked} API references across ${pages().length} pages, every tag, token, event, hook, package and exported name real`,
)
