#!/usr/bin/env node
/**
 * Checks that a component importing nothing renders nothing it does not own.
 *
 * **A custom element registers on import, and a tag nobody imported is an inert
 * unknown element.** It is not an error, it does not warn, and it lays out as an
 * empty inline box, so a panel built around one looks like a panel that failed
 * to open rather than like a missing import.
 *
 * **A template names no tag at all.** It interpolates one:
 * `<${this.tag('date-picker')}>`, which resolves through the class's `tier` to
 * `helix-headless-date-picker` in the headless tier and `helix-date-picker` in the
 * styled one. Each tier side-effect imports its own version of the family, so a
 * consumer on either tier gets children from the tier they are on.
 *
 * **Naming the public tag instead is wrong.** A base component rendering
 * `<helix-select>` composes a styled element out of a tier that must not depend
 * on the styled one, and it leaves the headless tier broken for anyone who
 * imports only it: nothing registers that tag, so the control is an inert
 * unknown element. The argument for it, that each tier imports its own element
 * under one name, holds only while nobody imports both, and the docs site
 * imports both.
 *
 * **A missing import is invisible here.** The sandbox and the docs site both
 * import the whole barrel, so every example looks right while a family that
 * registers `helix-date-input` and `helix-headless-date-picker` leaves
 * `helix-date-picker` undefined for the first consumer who imports one
 * component.
 *
 * **What counts as rendering a tag.** `<${this.tag('name')}`, which is the only
 * way a template may name one, plus a literal `<helix-…` opening tag, which is
 * the fault this also reports. Comments and JSDoc are stripped first: the class
 * docs are full of usage examples naming tags the file has no business
 * importing, and those are prose.
 *
 * **A styled component renders whatever its base renders.** It extends the
 * headless class and almost never overrides `render`, so the tags are in the
 * tier below and the obligation is inherited with them. Checking only the file
 * the tag is written in cannot work: the headless file may import the family
 * while the styled one imports nothing, and the styled file has no tag in it to
 * find. So each styled file is held to what its counterpart one tier down
 * renders, matched by the path they share.
 *
 * **What counts as importing it.** A side-effect `import '…/index.js'` whose path
 * ends in the family's folder.
 *
 * **Which family a tag belongs to is read from where it is declared, not from
 * its name.** Taking the tier prefix off the tag and calling the rest the family
 * is right for a root and wrong for a part: `helix-menu-item` is declared in
 * `menu/item/`, so the name says `menu-item` and the folder to import is `menu`.
 * Every tag in the repo declares itself with `@customElement`, and the file it
 * does that in is three segments deep, so the folder is not a guess.
 *
 * A component rendering its own family is exempt, since a part rendering a
 * sibling part is one folder importing itself.
 *
 * **The styled tier has to say it is the styled tier.** `tier` defaults to
 * `helix-headless-`, so a styled component that inherits an interpolating template
 * and does not override it renders base children inside a styled shadow root:
 * unstyled, silent, and passing every other check. One line, `static override
 * tier = 'helix-'`, and it is held to it here.
 *
 * Run with `bun run check:api:composed` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE, TAG_PREFIX, TIERS } from './lib/workspace.mjs'

/* **Where a tag can be written by something that is not a component.**
 *
 * A free function in `helix/core` has no class and no tier to read, so every
 * rule above is blind to a literal tag written in one: they hold a *component*
 * to interpolating through `tier`. The consequence is the one the tier split
 * exists to prevent, a headless consumer getting an inert unknown element, and
 * no test can see it either, since the sandbox frame and the docs site both
 * import the whole library so the tag is always registered by the time anything
 * looks.
 *
 * A free function takes the tag as an argument instead, which is what every
 * component already does one level up. */
const SHARED = [SOURCE.core]

/** Every `.ts` under a directory that is a component rather than a spec. */
const sources = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sources(path))
    } else if (entry.endsWith('.ts') && !entry.includes('.spec.') && !entry.endsWith('.css.ts')) {
      found.push(path)
    }
  }
  return found
}

/* Block comments carry usage examples naming tags the file does not render, and
   line comments carry the same in shorter form. Both are prose. */
const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The family folder a tag is declared in.
 *
 * Built from `@customElement` rather than from the tag's own text, for the
 * reason the note above records. The fallback is the tag's own name, which is
 * right for every root and is all there is to say about a tag this repo does
 * not declare.
 */
const declaredIn = new Map()
const familyOf = (name) => declaredIn.get(name) ?? name

/** What a file side-effect imports, by family folder. */
const imports = (code) => {
  const found = new Set()
  for (const match of code.matchAll(/^import\s+'([^']+)'/gm)) {
    found.add(
      match[1]
        .replace(/\/index\.js$/, '')
        .split('/')
        .at(-1),
    )
  }
  return found
}

/** The families a file's templates open, by the name inside `this.tag()`. */
const renders = (code) =>
  new Set([...code.matchAll(/<\$\{this\.tag\('([a-z-]+)'\)\}/g)].map((one) => one[1]))

/** The `helix-…` tags a file's templates open literally, which none may. */
const literals = (code) => new Set([...code.matchAll(/<(helix-[a-z-]+)/g)].map((one) => one[1]))

const problems = []
let checked = 0
const read = new Map()
const shared = new Map()
for (const dir of SHARED) {
  for (const path of sources(dir)) {
    shared.set(path, withoutComments(readFileSync(path, 'utf8')))
  }
}
for (const tier of TIERS) {
  for (const path of sources(tier)) {
    const code = withoutComments(readFileSync(path, 'utf8'))
    read.set(path, code)
    for (const match of code.matchAll(/@customElement\('helix-(?:headless-)?([a-z-]+)'\)/g)) {
      declaredIn.set(match[1], path.split('/').at(-3))
    }
  }
}

for (const [path, code] of read) {
  const own = path.split('/').at(-3)
  const tags = renders(code)

  /* A styled component inherits its base's template, so it inherits every tag in
     it. Matched by the path the two tiers share. */
  const inherited = path.startsWith(SOURCE.styled)
    ? read.get(path.replace(SOURCE.styled, SOURCE.headless))
    : undefined
  if (inherited) {
    for (const tag of renders(inherited)) {
      tags.add(tag)
    }
  }

  /* A tag written out is a tag one tier owns. The headless tier may own
     neither: naming a styled tag is the dependency the tiers exist to prevent,
     and naming its own base tag pins the children of every styled subclass to
     the headless tier. A styled component with a tier below it is under the same
     obligation, since that template is the one its base wrote. A styled-only
     component has no tier to be agnostic for and may name what it renders. */
  const twin = path.startsWith(SOURCE.headless) || inherited !== undefined
  for (const tag of literals(code)) {
    checked += 1
    if (twin) {
      problems.push(
        `${path}: writes \`<${tag}>\` into a template. The headless tier may not name a ` +
          `styled tag, and naming a base tag pins the children of every styled subclass ` +
          `to the headless tier. Interpolate it: \`<\${this.tag('${tag.replace(/^helix-(headless-)?/, '')}')}>\`.`,
      )
    } else if (tag.startsWith('helix-headless-')) {
      problems.push(
        `${path}: writes \`<${tag}>\` into a template. A styled component renders styled ` +
          'children. Drop the `headless-`.',
      )
    }
  }

  /* The styled tier renders the styled family only if it says so, and the
     default says the opposite. A styled file inheriting an interpolating
     template and no `tier` renders base children into a styled shadow root. */
  if (
    inherited &&
    renders(inherited).size > 0 &&
    !new RegExp(`static override tier = '${TAG_PREFIX}'`).test(code)
  ) {
    problems.push(
      `${path}: inherits a template that interpolates its children's tags, and never ` +
        `overrides \`tier\`, so it renders \`helix-headless-…\` children inside a styled ` +
        `shadow root. Add \`static override tier = '${TAG_PREFIX}'\`.`,
    )
  }

  const imported = imports(code)
  for (const name of tags) {
    checked += 1
    const family = familyOf(name)
    if (family === own || imported.has(family)) {
      continue
    }
    const where = renders(code).has(name) ? 'renders' : 'inherits'
    problems.push(
      `${path}: ${where} \`<${name}>\` and never imports it. A custom element registers ` +
        `on import, so a consumer importing this family alone gets an inert unknown ` +
        `element. Add \`import '../../${family}/index.js'\`.`,
    )
  }
}

/* A shared module has no tier, so any literal `helix-` tag in it is a decision
   about a tier taken by a file that cannot know one. */
for (const [path, code] of shared) {
  for (const tag of literals(code)) {
    checked += 1
    problems.push(
      `${path}: writes \`<${tag}>\` into a template, and is on no tier. A shared module ` +
        `renders into whichever tier called it, so naming a tag here picks one for every ` +
        `caller: the headless tier gets an inert unknown element. Take the tag as an ` +
        `argument and let the caller pass \`this.tag('${tag.replace(/^helix-(headless-)?/, '')}')\`.`,
    )
  }
}

if (problems.length > 0) {
  console.error(`Components rendering a tag they do not import (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

/* **The number is why `check:spec:floors` can see this check at all.** Floors
   reads integers out of a success line and skips a line that has none, so a
   check that prints no number is exempt from the thing floors exists to catch.
   `checked` is a tally of *assertions*, one per tag resolved or refused, rather
   than of files scanned, which would keep rising while the checking fell to
   zero. */
console.log(
  `composed: ${checked} rendered helix tags, every one imported by the file that renders it`,
)
