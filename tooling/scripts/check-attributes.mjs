/**
 * A document rule may only select a component by an attribute it reflects.
 *
 * **The rule the library states, read from the consumer's side.** `helix.md`
 * says reflect only what CSS selects on, which decides what a component
 * publishes. Nothing said the reverse to whoever writes the CSS, so a site rule
 * could reach for an attribute a component never promised, and it failed in
 * exactly one navigation mode.
 *
 * **The failure this was written for.** The theme builder routed its two
 * colored slider tracks with `.themeChannel[label="Saturation"]`. A `label`
 * attribute is only in the DOM when a *server* wrote the element into HTML: on a
 * client-side navigation React creates the element and assigns `label` as a
 * property, Lit does not reflect it, and the selector matches nothing. Measured
 * on the running site, soft navigation against reload: ten sliders, every label
 * empty on the first and every one present on the second, with the gradients
 * following exactly. A reload of the same page showed them, which is what makes
 * this survive every screenshot anybody takes.
 *
 * **The line is whether the component declares the property, not whether the
 * attribute is unusual.** React sets a value as a property when one exists on
 * the element and as an attribute when it does not, so the three cases are:
 *
 * - declared and reflecting, like `Text.as`: Lit writes the attribute back
 *   whichever way it was set, and the selector always matches.
 * - declared and not reflecting, like `Slider.label`: property only, and the
 *   attribute exists solely in server-rendered markup. **This is the bug.**
 * - not declared at all: React has nowhere to put it but an attribute, so it is
 *   always there.
 *
 * Global and `data-` attributes are exempt for the third reason: nothing
 * declares them as properties, so they are always written.
 *
 * Run with `bun run check:api:attributes` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SITE = join(ROOT, 'fusion/site')
const MANIFESTS = [
  'helix/core/custom-elements.json',
  'helix/headless/custom-elements.json',
  'helix/sandbox/custom-elements.json',
  'helix/styled/custom-elements.json',
]

/**
 * Attributes that survive being set as properties, because the platform reflects
 * them itself.
 *
 * **Not because nothing declares them, which is the wrong reason.** Every one of
 * these *is* a property on `HTMLElement`, so React assigns them exactly the way
 * it assigns `label`. What makes them safe is that the HTML specification
 * defines them as reflected IDL attributes: writing `element.hidden` writes the
 * attribute, with no help from Lit.
 *
 * `data-` and `aria-` are exempt for the other reason: they are not properties
 * at all, so React has nowhere to put them but an attribute.
 */
const ALWAYS_WRITTEN = new Set([
  'class',
  'dir',
  'hidden',
  'id',
  'lang',
  'part',
  'role',
  'slot',
  'style',
  'tabindex',
  'title',
])

/**
 * Selectors that reach an attribute a component does not reflect and are
 * deliberate anyway, each with the reason.
 *
 * Empty, and it should stay that way: the honest fix is to reflect the property
 * or to stop selecting on it. An entry here is a claim that server-rendered
 * markup is the only path that matters for one rule, which is the kind of claim
 * that should expire.
 */
const ACCEPTED = new Map()

/* `public/` holds build output: the sandbox frame's stylesheet is generated from
   `preview/preview-frame.css`, which is in the source tree and is scanned. Reading
   both would report the same rule twice and would report it against a path
   nobody edits. */
const SKIP = new Set(['node_modules', 'public'])

const walk = (from, take, into = []) => {
  for (const entry of readdirSync(from)) {
    if (SKIP.has(entry) || entry.startsWith('.')) {
      continue
    }
    const path = join(from, entry)
    if (statSync(path).isDirectory()) {
      walk(path, take, into)
    } else if (take(entry)) {
      into.push(path)
    }
  }
  return into
}

const uncommented = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ' ')

/* What each tag declares and whether it reflects it. A member carrying an
   `attribute` is a property React will find on the element; `reflects` is what
   decides whether the attribute survives being set as one. */
const declared = new Map()
for (const path of MANIFESTS) {
  const manifest = JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
  for (const module_ of manifest.modules ?? []) {
    for (const declaration of module_.declarations ?? []) {
      const tag = declaration.tagName
      if (!tag) {
        continue
      }
      const members = declared.get(tag) ?? new Map()
      for (const member of declaration.members ?? []) {
        if (member.attribute) {
          members.set(member.attribute, Boolean(member.reflects))
        }
      }
      declared.set(tag, members)
    }
  }
}

/* Every attribute a document rule selects on, and where. Attribute selectors
   only: a bare `[foo]` and `[foo="bar"]` fail the same way. */
const selected = new Map()
for (const path of walk(SITE, (name) => name.endsWith('.css'))) {
  const source = uncommented(readFileSync(path, 'utf8'))
  for (const found of source.matchAll(
    /([^\s{}();,]*)\[\s*([a-zA-Z][\w-]*)\s*[~^|$*]?=?[^\]]*\]/g,
  )) {
    const name = found[2].toLowerCase()
    if (name.startsWith('data-') || name.startsWith('aria-') || ALWAYS_WRITTEN.has(name)) {
      continue
    }
    const where = selected.get(name) ?? []
    where.push({
      /* The compound the attribute sits in, so a rule naming a tag can be held
         to that tag and a rule naming a class can be held to its neighborhood.
         `.themeChannel[label=]` gives the empty tag and the class. */
      tag: /^helix-[a-z-]+$/.test(found[1]) ? found[1] : undefined,
      where: relative(ROOT, path),
      within: dirname(relative(ROOT, path)),
    })
    selected.set(name, where)
  }
}

/* Which components the site writes each attribute onto. Read from the markup
   rather than guessed from the selector, because a rule may name a class rather
   than a tag, which is exactly what the failing one did. */
const written = new Map()
for (const path of walk(SITE, (name) => name.endsWith('.tsx') || name.endsWith('.html'))) {
  const source = readFileSync(path, 'utf8')
  for (const element of source.matchAll(/<(helix-[a-z-]+)((?:\s+[^>]*)?)>/g)) {
    const tag = element[1]
    for (const attribute of element[2].matchAll(/(?:^|\s)([a-zA-Z][\w-]*)\s*=/g)) {
      const name = attribute[1].toLowerCase()
      const where = written.get(name) ?? []
      where.push({ tag, where: relative(ROOT, path), within: dirname(relative(ROOT, path)) })
      written.set(name, where)
    }
  }
}

const problems = []

/* **One rule is one finding.** A selector reaches every component in its subtree
   that carries the attribute, and reporting each pair separately turned a single
   broken rule in the theme builder into thirty-four lines saying the same thing.
   What a reader needs is the rule, the attribute, and enough of the components to
   see what it was reaching for. */
const unmatched = new Map()
for (const [name, rules] of selected) {
  for (const rule of rules) {
    for (const element of written.get(name) ?? []) {
      /* **A stylesheet reaches its own subtree**, which is what this layout
         means by colocation: `app/(tool)/helix/theme/theme.css` and the markup
         beside it, `app/site.css` and everything under `app/`. Without it a
         `[target]` rule in one route pairs with a component in another and the
         check reports a rule that cannot reach it. A selector naming a tag
         outright is held to that tag instead, which is stricter and needs no
         guess about reach. */
      const reaches = rule.tag ? rule.tag === element.tag : element.within.startsWith(rule.within)
      if (!reaches || ACCEPTED.has(`${element.tag}[${name}]`)) {
        continue
      }
      const reflects = declared.get(element.tag)?.get(name)
      if (reflects === undefined || reflects) {
        continue
      }
      const key = `${rule.where}\u0000${name}`
      const tags = unmatched.get(key) ?? new Set()
      tags.add(element.tag)
      unmatched.set(key, tags)
    }
  }
}

for (const [key, tags] of [...unmatched].sort()) {
  const [where, name] = key.split('\u0000')
  const named = [...tags].sort()
  const shown = named
    .slice(0, 3)
    .map((tag) => `<${tag}>`)
    .join(', ')
  const rest = named.length > 3 ? ` and ${named.length - 3} more` : ''
  problems.push(
    `${where} selects on \`[${name}]\` and reaches ${shown}${rest}, which declare ` +
      `\`${name}\` as a property and do not reflect it. React assigns a declared ` +
      'property as a property, so the attribute is in the DOM only when a server ' +
      'rendered the element: the rule matches after a reload and matches nothing after ' +
      'a client-side navigation. Reflect the property, or style it some way that does ' +
      'not read an attribute.',
  )
}

for (const key of ACCEPTED.keys()) {
  const [, tag, name] = /^(.+)\[(.+)\]$/.exec(key) ?? []
  if (!written.get(name)?.some((element) => element.tag === tag)) {
    problems.push(`\`${key}\` is in \`ACCEPTED\` and nothing writes it any more. Delete the entry.`)
  }
}

if (problems.length > 0) {
  console.error(`Attribute selectors that do not always match (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const checked = [...selected.keys()].length
console.log(
  `attributes: ${checked} attribute${checked === 1 ? '' : 's'} selected by document rules, ` +
    'every one of them reflected, global, or not a component property at all',
)
