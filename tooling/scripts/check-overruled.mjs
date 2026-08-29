#!/usr/bin/env node
/**
 * Checks for component CSS a document rule silently overrules.
 *
 * **A shadow rule loses to a document rule, whatever the specificity and
 * whatever the layer.** That is the cascade's encapsulation context, sorted
 * before both, and it was measured in Chrome 148 rather than recalled: a
 * `::slotted()` rule lost to an unlayered `:where()` document rule and to the
 * same rule inside a low `@layer` alike, and `:host` lost to both. The only
 * normal-declaration escape is `!important` from the inner tree, which moves the
 * fight onto consumers, who would then need `!important` to override anything.
 *
 * So a declaration in a component's stylesheet, aimed at an element a document
 * rule also names, does nothing. It is valid CSS, it compiles, it ships, and it
 * is dead. Nothing catches it: the selector matches, the property is spelled
 * correctly, the token resolves, and the element simply shows another value.
 *
 * The failure is per-declaration, not per-rule, which is the tell this looks
 * for: `font-weight` and `letter-spacing` come through from the shadow while
 * `font-size` and `color` do not, so the rule looks alive.
 *
 * **What counts as a document rule reaching a component.** A selector in
 * `helix/styles` that names a `helix-*` tag and then reaches past it: a
 * descendant, a child, or a `::part()`. A selector naming only the tag itself is
 * the same case, since `:host` loses too.
 *
 * `::part()` is exempt. It is the published door into a component, so a document
 * rule using one is the mechanism working rather than a collision, and the
 * component cannot style through it anyway.
 *
 * `data-` recipes are exempt where they are paired: `[data-button], helix-button`
 * is one decision written for two surfaces, which is the pattern the base layer
 * exists for. What is not exempt is the component half sitting alone.
 *
 * Run with `bun run check:css:overruled` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

/* **The base layer and the site, because both are document stylesheets.**
 *
 * An app is the more likely source of the collision, not the base layer: a
 * consumer writing a rule for a component they are using has no reason to know
 * that it beats the component's own, whatever the specificity and whatever the
 * layer. */
const STYLES = [SOURCE.styles, 'fusion/site/app']
/** Every `.css` under a directory, skipping the generated `.css.ts` beside it. */
const stylesheets = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...stylesheets(path))
    } else if (entry.endsWith('.css')) {
      found.push(path)
    }
  }
  return found
}

/** Comments carry example selectors and prose about rules; neither is a rule. */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every `selector { … }` pair, flattened out of any at-rule wrapping them. */
const rules = (css) => {
  const found = []
  const text = withoutComments(css)
  for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().split('\n').pop().trim()
    if (selector.startsWith('@') || selector === '') {
      continue
    }
    found.push({ body: match[2], selector: match[1].trim() })
  }
  return found
}

/** The properties a rule sets, shorthands included as written. */
const declared = (body) =>
  new Set(
    body
      .split(';')
      .map((one) => one.split(':')[0]?.trim())
      .filter((one) => one && !one.startsWith('--') && !one.startsWith('/')),
  )

/**
 * Which component a document selector reaches into, and how.
 *
 * `null` where it reaches none, or where it is exempt: a `::part()`, or a
 * `data-` recipe carrying the component as a second surface.
 */
const reaches = (selector) => {
  const compact = selector.replace(/\s+/g, ' ').trim()
  const parts = compact.split(',').map((one) => one.trim())
  const paired = parts.some((one) => one.includes('data-'))
  for (const one of parts) {
    const tag = /helix-[a-z-]+/.exec(one)?.[0]
    if (!tag || one.includes('::part(')) {
      continue
    }
    if (paired) {
      // One decision written for a plain element and for the component.
      continue
    }
    return { rest: one.slice(one.indexOf(tag) + tag.length).trim(), tag }
  }
  return null
}

const problems = []

/* The document side: every rule in the styles tier that names a component. */
const documentRules = []
for (const path of STYLES.flatMap((dir) => stylesheets(dir))) {
  for (const rule of rules(readFileSync(path, 'utf8'))) {
    const hit = reaches(rule.selector)
    if (hit) {
      documentRules.push({ ...hit, path, properties: declared(rule.body), selector: rule.selector })
    }
  }
}

/* The component side: what each stylesheet declares for its host and its slots. */
for (const path of stylesheets(SOURCE.styled)) {
  /* **The element this file styles, not the family it lives in.** Comparing
   * every stylesheet in a family against `helix-<family>` holds a document rule
   * for the root against each of the family's parts, which it cannot reach.
   *
   * A part's tag is its file name, which is how the composition plugin reads
   * this tree too: `sandbox/root/sandbox-root.css` is `helix-sandbox` and
   * `sandbox/toolbar/sandbox-toolbar.css` is `helix-sandbox-toolbar`. */
  const [family, part] = path.split('/').slice(-3, -1)
  const tag = part === 'root' ? `helix-${family}` : `helix-${family}-${part}`
  /* **The host and the slots are two sets, because a document rule reaches one
     or the other and never both.**
   *
   * Merging them reports a rule for the host against what the file declares on
   * a slotted child, which it cannot reach.
   *
   * `reaches` already records what follows the tag. Nothing after it is the
   * host; anything after it is a descendant, which is what `::slotted` styles. */
  const host = new Set()
  const slotted = new Set()
  for (const rule of rules(readFileSync(path, 'utf8'))) {
    const into = /::slotted\(/.test(rule.selector)
      ? slotted
      : /:host/.test(rule.selector)
        ? host
        : null
    if (!into) {
      continue
    }
    for (const property of declared(rule.body)) {
      into.add(property)
    }
  }
  for (const rule of documentRules) {
    if (rule.tag !== tag) {
      continue
    }
    const owned = rule.rest === '' ? host : slotted
    const dead = [...rule.properties].filter((property) => owned.has(property))
    if (dead.length > 0) {
      problems.push(
        `${path}: sets ${dead.map((one) => `\`${one}\``).join(', ')} on its host or a slot, ` +
          `and \`${rule.selector}\` in ${rule.path} sets the same. A document rule wins ` +
          'whatever the specificity and whatever the layer, so the component here is dead.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Component CSS a document rule overrules (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `overruled: ${documentRules.length} document rules reach a component, none of them silently`,
)
