#!/usr/bin/env node
/**
 * Checks that a form control reads `:host(:disabled)` rather than the attribute.
 *
 * **The pseudo-class matches on two things and the attribute selector on one.**
 * `:disabled` is true for a control carrying the attribute *and* for one inside
 * an ancestor `<fieldset disabled>`, which sets no attribute on anything. So a
 * component styled with `:host([disabled])` refuses interaction from the
 * fieldset, because the platform disables it either way, and paints itself as
 * live. That reads as a control that is simply broken, and it is invisible in
 * every example that does not happen to use a fieldset.
 *
 * **Measured** by rendering every form control twice, once with the attribute
 * and once inside a disabled fieldset: nineteen of twenty matched, and the one
 * that did not painted full primary in the fieldset against half opacity with
 * the attribute, from a single `:host([disabled])` on one rule.
 *
 * **Only form-associated components are held to this**, and per part rather than
 * per family, which is what makes the rule precise rather than a blanket ban.
 * `helix-radio` extends `HelixElement` and `helix-radio-group` extends
 * `HelixFormElement`: a lone radio is not a control, it is an answer to one, so
 * it never inherits a fieldset's state and the `disabled` its group writes onto
 * it really is a plain attribute, so keying on the family reports it as a bug.
 * A component qualifies if the headless file at the same path reaches
 * `HelixFormElement`, matched the way `check:api:composed` matches its tiers.
 *
 * Run with `bun run check:api:disabled` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

const WEB = SOURCE.styled
const HEADLESS = SOURCE.headless

/** Every file under a directory whose name ends in one of `suffixes`. */
const files = (dir, ...suffixes) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...files(path, ...suffixes))
    } else if (suffixes.some((one) => entry.endsWith(one))) {
      found.push(path)
    }
  }
  return found
}

/* Comments quote selectors while explaining them, including this rule's own
   note in `listbox-root.css`, which names the wrong form in order to reject it. */
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '')

/** Which parts are form-associated, read one tier down and keyed by shared path. */
const formAssociated = new Set()
for (const path of files(HEADLESS, '.ts')) {
  if (path.includes('.spec.') || path.endsWith('.css.ts')) {
    continue
  }
  const source = withoutComments(readFileSync(path, 'utf8'))
  if (/extends\s+[\w(]*(?:HelixFormElement|MixinField)/.test(source)) {
    formAssociated.add(path.slice(HEADLESS.length + 1).replace(/\.ts$/, ''))
  }
}

const problems = []
for (const path of files(WEB, '.css')) {
  const part = path.slice(WEB.length + 1).replace(/\.css$/, '')
  if (!formAssociated.has(part)) {
    continue
  }
  const code = withoutComments(readFileSync(path, 'utf8'))
  for (const [selector] of code.matchAll(/:host\(\[disabled\][^)]*\)/g)) {
    problems.push(
      `${path}: ${selector} misses an ancestor <fieldset disabled>. Use :host(:disabled).`,
    )
  }
}

if (problems.length > 0) {
  console.error(`Form controls styled on the disabled attribute (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(`disabled: ${formAssociated.size} form-associated parts, every one on :disabled`)
