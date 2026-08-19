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
 * **It has happened twice, and cost hours both times.** Outline styled its links
 * `foreground-muted` from the day it was written, and `:where(a)` in the base
 * layer painted every one of them brand blue and underlined instead. By the
 * comment left beside the workaround, no outline had ever shown the color the
 * component asked for. Dialog's header size was lifted into the base layer for
 * the same reason and the component kept a `font-size` beside it that read as
 * the deciding value and was not: changing it moved nothing, which is a
 * genuinely disorienting thing to debug, because every other declaration in the
 * same rule does apply.
 *
 * That is the tell this looks for, and it is why the check is worth having
 * rather than a rule in a document nobody greps: the failure is per-declaration,
 * not per-rule. `font-weight` and `letter-spacing` come through from the shadow
 * while `font-size` and `color` do not, so the rule looks alive.
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
 * Run with `bun run check:overruled` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STYLES = 'helix/styles/src'
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
for (const path of stylesheets(STYLES)) {
  for (const rule of rules(readFileSync(path, 'utf8'))) {
    const hit = reaches(rule.selector)
    if (hit) {
      documentRules.push({ ...hit, path, properties: declared(rule.body), selector: rule.selector })
    }
  }
}

/* The component side: what each stylesheet declares for its host and its slots. */
for (const path of stylesheets('helix/web/src')) {
  const family = path.split('/').at(-3)
  const owned = new Set()
  for (const rule of rules(readFileSync(path, 'utf8'))) {
    if (!/::slotted\(|:host/.test(rule.selector)) {
      continue
    }
    for (const property of declared(rule.body)) {
      owned.add(property)
    }
  }
  for (const rule of documentRules) {
    if (rule.tag !== `helix-${family}`) {
      continue
    }
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
