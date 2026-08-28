#!/usr/bin/env bun
/**
 * Every attribute a stylesheet selects on the host can be reached from a property.
 *
 * **The third check on one rule, and the direction the other two do not ask
 * about.** `check:api:reflected` bans a default on a reflecting property and
 * `check:api:reflected-defaults` bans a default that writes an attribute; both look
 * at properties that already reflect. Neither notices a property that *should*
 * reflect and does not, which is the half the rule states first: reflection
 * exists so a selector can reach a value.
 *
 * A rule keyed on `:host([x])` where `x` does not reflect works for whoever
 * wrote the attribute in markup and silently does nothing for anybody who sets
 * the property. That is every script, and it is every React consumer by default,
 * React assigning a matching property rather than an attribute.
 *
 * Four had drifted, and none was found by reading:
 *
 * - `avatar-group.max`, folded with `:host([max="N"]) ::slotted(:nth-child(n + N+1))`.
 *   Set from script, every avatar drew full size beside a count claiming two
 *   were hidden.
 * - `breadcrumb.href`, padded with `:host(:not([href])) [part="link"]`. Every
 *   crumb in a React trail lost 8px at once. Its docblock gave the reason as
 *   "nothing selects on it", which was untrue when it was written.
 * - `code-block.noCopy`, whose gutter is reserved by `:host(:not([no-copy]))`.
 *   The button went away and the 40px it stood in stayed. This check found that
 *   one; the other two were found by picture, which is the argument for having
 *   it.
 * - `drawer.modal` is the same family and is invisible here: its fault is a
 *   custom converter rather than a selector, so it is named rather than caught.
 *
 * **What is not asked about.** `data-` names are the library's own answer to
 * this problem, written by the component rather than by a property, and `aria-`,
 * `role`, `slot`, `hidden`, `inert` and `popover` belong to the platform. An
 * attribute with no property of that name is an author's to write and nothing
 * else can set it, which is a different shape and not this fault.
 *
 * **The converter case this cannot reach.** A same-named attribute whose
 * property carries `type: Number`, `type: Boolean` or a `converter` has a second
 * version of the problem: React assigns the property verbatim, so the converter
 * never runs and `split="35"` arrives as a string, `modal="false"` as a truthy
 * one. That is a fault in the example rather than the component, and
 * `check:spec:visual-parity` holds it by rendering both syntaxes and comparing.
 */
import { readFileSync } from 'node:fs'

const glob = (pattern) => [...new Bun.Glob(pattern).scanSync('.')]

/* Written by the component itself or by the platform, not by a reactive
   property, so "does it reflect" is not a question about them. `data-` mirrors
   are the library's documented answer to exactly this problem. */
const NOT_PROPERTIES =
  /^(data-|aria-|role$|slot$|hidden$|inert$|popover$|dir$|lang$|part$|id$|class$|style$)/

const hostAttributes = new Map() // family -> Set(attribute)
for (const file of glob('helix/styled/src/*/**/*.css')) {
  const family = file.split('/')[3]
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, inside] of text.matchAll(/:host\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g)) {
    for (const [, name] of inside.matchAll(/\[\s*([a-zA-Z][\w-]*)/g)) {
      if (NOT_PROPERTIES.test(name)) {
        continue
      }
      if (!hostAttributes.has(family)) {
        hostAttributes.set(family, new Set())
      }
      hostAttributes.get(family).add(name)
    }
  }
}

/* Property declarations from both tiers, keyed by family, since a styled sheet
   routinely selects on something the headless base declares. */
const declared = new Map() // family -> Map(attribute -> {reflect, file, name})
for (const file of glob('helix/{headless,styled}/src/*/**/*.ts')) {
  if (file.includes('.spec.') || file.endsWith('.css.ts')) {
    continue
  }
  const family = file.split('/')[3]
  const text = readFileSync(file, 'utf8')
  for (const [, options, name] of text.matchAll(
    /@property\(\s*(?:\{([^}]*)\})?\s*\)\s*(?:\n\s*)*(?:(?:get|set|override|declare|readonly)\s+)*([A-Za-z_$][\w$]*)/g,
  )) {
    const opts = options ?? ''
    if (/attribute:\s*false/.test(opts)) {
      continue
    }
    const attribute = /attribute:\s*'([^']+)'/.exec(opts)?.[1] ?? name.toLowerCase()
    if (!declared.has(family)) {
      declared.set(family, new Map())
    }
    const held = declared.get(family).get(attribute)
    /* A getter and a setter are two matches for one property; either carrying
       `reflect` settles it. */
    declared.get(family).set(attribute, {
      file,
      name,
      reflect: (held?.reflect ?? false) || /reflect:\s*true/.test(opts),
    })
  }
}

const findings = []
let checked = 0
for (const [family, attributes] of [...hostAttributes].sort()) {
  for (const attribute of [...attributes].sort()) {
    const property = declared.get(family)?.get(attribute)
    if (property === undefined) {
      /* No property of that name: an attribute the author writes and nothing
         else can set, which is a different shape and not this fault. */
      continue
    }
    checked += 1
    if (!property.reflect) {
      findings.push(
        `${family}: \`${attribute}\` is selected on by CSS, and \`${property.name}\` does not reflect (${property.file})`,
      )
    }
  }
}

if (findings.length > 0) {
  console.error(
    `reachable: ${findings.length} of ${checked} host-attribute rules cannot be reached from a ` +
      `property.\n\n  ${findings.join('\n  ')}\n\n` +
      '  Add `reflect: true`. If the property carries a default, make it optional first, or\n' +
      '  `check:api:reflected` will refuse it: a reflected property takes no default.\n',
  )
  process.exit(1)
}

console.log(
  `reachable: ${checked} host-attribute rules, every one reachable by setting its property`,
)
