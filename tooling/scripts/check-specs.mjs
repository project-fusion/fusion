#!/usr/bin/env node
/**
 * A server-rendered assertion has to be made against structure, not the string.
 *
 * The repo's rules say this in prose already: **never assert structure against
 * the raw SSR string.** Declarative shadow DOM inlines the component's
 * stylesheet into the very markup being asserted, and that stylesheet names
 * every part, host attribute and token the component uses. So
 * `toContain('part="media"')` passes on a *selector*, and
 * `not.toContain('data-scrolled')` fails on a `:host([data-scrolled])` *rule*.
 * Both say nothing about what rendered.
 *
 * That has produced a false pass twice, once hiding a stale build for several
 * commits, which is what a prose rule is worth against a spec that looks right.
 *
 * The helpers in `@fusion-io/testing/ssr` are the way through: `withoutStyles`
 * strips the sheet, `hostTag` and `hostAttributes` read the host, `partTag` and
 * `hasPart` read one rendered part. Anything that went through one of them is
 * fine; the raw return of `ssr()` is not.
 *
 * `toContain` and `toMatch`, in both polarities. `toMatch` is the one that was
 * actually lying when this was written: `expect(markup).toMatch(/orientation="horizontal"/)`
 * on the card passed against `:host([orientation="horizontal"])` in the card's
 * own inlined stylesheet, on a host that carries no such attribute at all.
 *
 * An `expect(markup).toBe` comparison of the whole string is left alone: it is
 * not a substring search and would fail loudly rather than quietly.
 *
 * Run with `bun run check:specs` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/headless/src', 'helix/sandbox/src', 'helix/web/src']

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else if (path.endsWith('.ssr.spec.ts')) {
      found.push(path)
    }
  }
  return found
}

const HELPERS = ['withoutStyles', 'hostTag', 'hostAttributes', 'partTag', 'hasPart']

const problems = []

for (const tier of TIERS) {
  for (const path of walk(tier)) {
    const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

    /* Which names hold the raw string. Anything assigned straight from `ssr(`
       is the whole document, stylesheet included; anything assigned from a
       helper has already been narrowed. */
    const raw = new Set()
    for (const [, name, value] of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*([^\n]+)/g)) {
      if (/\bssr\(/.test(value) && !HELPERS.some((helper) => value.includes(`${helper}(`))) {
        raw.add(name)
      }
    }

    for (const [line, subject] of text
      .split('\n')
      .map((one, index) => [index + 1, one])
      .filter(([, one]) => /\.(not\.)?(toContain|toMatch)\(/.test(one))) {
      const target = subject.match(/expect\(\s*([\w.()]+)/)
      if (!target) {
        continue
      }
      const name = target[1].replace(/\(.*/, '')
      const isRaw = raw.has(name) || /^ssr$/.test(name)
      if (!isRaw) {
        continue
      }
      problems.push(
        `${path}:${line}: \`${name}\` is the whole server document, stylesheet included, ` +
          'so a substring or pattern match here finds a selector as readily as a rendered ' +
          'attribute. Read it through `withoutStyles`, `hostTag`, `hostAttributes` or `partTag` first.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`SSR assertions made against the raw markup (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log('specs: every server-rendered assertion goes through a structural helper')
