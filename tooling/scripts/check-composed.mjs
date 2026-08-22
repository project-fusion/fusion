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
 * `helix-base-date-picker` in the headless tier and `helix-date-picker` in the
 * styled one. Each tier side-effect imports its own version of the family, so a
 * consumer on either tier gets children from the tier they are on.
 *
 * **Naming the public tag was the first arrangement, and it was wrong.** A base
 * component rendering `<helix-select>` composes a styled element out of a tier
 * that must not depend on the styled one, and it leaves the base tier broken for
 * anyone who imports only it: nothing registers that tag, so the control is an
 * inert unknown element. Forty-two sites across sixteen families did this. The
 * argument for it was that each tier imports its own element under one name,
 * which holds only while nobody imports both, and the docs site imports both.
 *
 * **It went wrong the first time it was used.** Date Input's headless tier
 * imported the base calendar and rendered `helix-date-picker`, and its styled tier
 * imported no calendar at all. Measured: importing that one family registered
 * `helix-date-input` and `helix-base-date-picker`, and left `helix-date-picker`
 * undefined. Every example still looked right, because the sandbox and the docs
 * site both import the whole barrel, which is exactly the condition under which
 * a missing import is invisible. It would have shipped that way to the first
 * consumer who imported one component.
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
 * the tag is written in is the version of this check that does not work: it was
 * written that way first, and it passed with the Date Input bug reintroduced,
 * because the headless file did import a calendar. It was the styled tier that
 * imported none, and the styled tier has no `<helix-date-picker>` in it to find.
 * So each styled file is held to what its counterpart one tier down renders,
 * matched by the path they share.
 *
 * **What counts as importing it.** A side-effect `import '…/index.js'` whose path
 * ends in the family's folder.
 *
 * **Which family a tag belongs to is read from where it is declared, not from
 * its name.** Taking the tier prefix off the tag and calling the rest the family
 * is right for a root and wrong for a part: `helix-menu-item` is declared in
 * `menu/item/`, so the name says `menu-item` and the folder to import is `menu`.
 * That went unexercised until `Video` rendered rows into a menu, and it reported
 * a component that had done exactly the right thing. Every tag in the repo
 * declares itself with `@customElement`, and the file it does that in is three
 * segments deep, so the folder is not a guess.
 *
 * A component rendering its own family is exempt, since a part rendering a
 * sibling part is one folder importing itself.
 *
 * **The styled tier has to say it is the styled tier**, and forgetting to is the
 * failure this arrangement replaces the old one's with. `tier` defaults to
 * `helix-base-`, so a styled component that inherits an interpolating template
 * and does not override it renders base children inside a styled shadow root:
 * unstyled, silent, and passing every other check. One line, `static override
 * tier = 'helix-'`, and it is held to it here.
 *
 * Run with `bun run check:composed` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/headless/src', 'helix/web/src']

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
 * reason the note above records. The fallback is the old guess, which is right
 * for every root and is all there is to say about a tag this repo does not
 * declare.
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
const read = new Map()
for (const tier of TIERS) {
  for (const path of sources(tier)) {
    const code = withoutComments(readFileSync(path, 'utf8'))
    read.set(path, code)
    for (const match of code.matchAll(/@customElement\('helix-(?:base-)?([a-z-]+)'\)/g)) {
      declaredIn.set(match[1], path.split('/').at(-3))
    }
  }
}

for (const [path, code] of read) {
  const own = path.split('/').at(-3)
  const tags = renders(code)

  /* A styled component inherits its base's template, so it inherits every tag in
     it. Matched by the path the two tiers share. */
  const inherited = path.startsWith('helix/web/src')
    ? read.get(path.replace('helix/web/src', 'helix/headless/src'))
    : undefined
  if (inherited) {
    for (const tag of renders(inherited)) {
      tags.add(tag)
    }
  }

  /* A tag written out is a tag one tier owns. The headless tier may own
     neither: naming a styled tag is the dependency the tiers exist to prevent,
     and naming its own base tag pins the children of every styled subclass to
     the base tier. A styled component with a tier below it is under the same
     obligation, since that template is the one its base wrote. A styled-only
     component has no tier to be agnostic for and may name what it renders. */
  const twin = path.startsWith('helix/headless/src') || inherited !== undefined
  for (const tag of literals(code)) {
    if (twin) {
      problems.push(
        `${path}: writes \`<${tag}>\` into a template. The headless tier may not name a ` +
          `styled tag, and naming a base tag pins the children of every styled subclass ` +
          `to the base tier. Interpolate it: \`<\${this.tag('${tag.replace(/^helix-(base-)?/, '')}')}>\`.`,
      )
    } else if (tag.startsWith('helix-base-')) {
      problems.push(
        `${path}: writes \`<${tag}>\` into a template. A styled component renders styled ` +
          'children. Drop the `base-`.',
      )
    }
  }

  /* The styled tier renders the styled family only if it says so, and the
     default says the opposite. A styled file inheriting an interpolating
     template and no `tier` renders base children into a styled shadow root. */
  if (inherited && renders(inherited).size > 0 && !/static override tier = 'helix-'/.test(code)) {
    problems.push(
      `${path}: inherits a template that interpolates its children's tags, and never ` +
        `overrides \`tier\`, so it renders \`helix-base-…\` children inside a styled ` +
        `shadow root. Add \`static override tier = 'helix-'\`.`,
    )
  }

  const imported = imports(code)
  for (const name of tags) {
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

if (problems.length > 0) {
  console.error(`Components rendering a tag they do not import (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log('composed: every rendered helix tag is imported by the file that renders it')
