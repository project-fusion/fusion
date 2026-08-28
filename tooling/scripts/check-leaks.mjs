#!/usr/bin/env node
/**
 * Checks that a subscription outliving its element is at least deliberate.
 *
 * **A leak here is a write to a tree nobody is looking at.** A listener on
 * `document`, a timer holding a closure over a removed element, a track that
 * goes on firing: none of them throw, none of them show up in a spec, and the
 * page keeps working while it accumulates them. Four were found by reading, and
 * reading is not repeatable.
 *
 * Two shapes, both narrow, because a false positive here is worse than a miss:
 *
 * 1. **An `addEventListener` on a target the element does not own, with no
 *    matching `removeEventListener` for the same event.** `document`,
 *    `globalThis` and `window` outlive every component, so anything attached to
 *    them has to come off. So does a `TextTrack`, a `MediaQueryList` or any
 *    object handed over by the platform, which is why the test is on the *event
 *    name* rather than on the target: a component that adds `cuechange` and
 *    never removes it is the finding whatever it added it to.
 * 2. **A `setTimeout` whose handle is stored on a field that nothing clears.**
 *    A timer nobody cancels keeps its closure, and its closure keeps the
 *    element. `Outline` held a 1.2 second one that touched `this` after the
 *    route had changed.
 *
 * **What it cannot see, said plainly.** A listener added and removed in equal
 * numbers still leaks if the add runs more often than the remove:
 * `IndicatorController` added one per placement and removed one per timeout,
 * and canceling the timeout on the next placement orphaned the listener in
 * between. That is a counting argument about run time and this is a counting
 * argument about source text. The same is true of a `removeEventListener`
 * passed a different function object than the one that was added, which is
 * every inline arrow.
 *
 * Both of those are why the fix is a field holding what is currently
 * subscribed, rather than a matching pair of calls, and that shape is what the
 * four fixed here now use.
 *
 * Run with `bun run check:api:leaks` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styled/src']

/* Events the element owns by construction: fired by something inside its own
   shadow root, which is discarded with it. Listening to these without removing
   is not a leak, it is the ordinary way a component hears from its own markup. */
const OWNED = new Set(['animationend', 'change', 'input', 'invalid', 'slotchange', 'transitionend'])

const sources = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.ts') && !entry.includes('.spec.') && !entry.endsWith('.css.ts')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

/* Comments stripped, and the newlines kept so a line number still names the
   line it did. Class docs are full of prose about listeners a file does not
   add, which is the same trap `check:api:composed` and `check:api:seams` both hit. */
const withoutComments = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, (match) => match.replaceAll(/[^\n]/g, ' '))
    .replaceAll(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length))

const problems = []
let watched = 0

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    const text = withoutComments(readFileSync(file, 'utf8'))

    const added = [...text.matchAll(/addEventListener\(\s*'([a-zA-Z-]+)'/g)]
    const removed = [...text.matchAll(/removeEventListener\(\s*'([a-zA-Z-]+)'/g)].map(
      (one) => one[1],
    )
    for (const event of new Set(added.map((one) => one[1]))) {
      watched += 1
      if (OWNED.has(event)) {
        continue
      }
      /* `once: true` takes itself off, which is the platform doing the work. */
      const selfClearing = new RegExp(
        String.raw`addEventListener\(\s*'${event}'[^;]*?once:\s*true`,
      ).test(text)
      if (selfClearing || removed.includes(event)) {
        continue
      }
      const at = added.find((one) => one[1] === event)
      const line = text.slice(0, at.index).split('\n').length
      problems.push(
        `${file}:${line}: listens for \`${event}\` and never stops. Anything the element does ` +
          'not own outlives it, and a handler on a removed element is a write to a tree nobody ' +
          'is looking at.',
      )
    }

    /* A timer parked on a field, and nothing that clears that field. */
    for (const match of text.matchAll(/this\.(\w+)\s*=\s*setTimeout\(/g)) {
      const field = match[1]
      if (new RegExp(String.raw`clearTimeout\(\s*this\.${field}\b`).test(text)) {
        continue
      }
      const line = text.slice(0, match.index).split('\n').length
      problems.push(
        `${file}:${line}: parks a timer on \`this.${field}\` and never clears it. The closure ` +
          'holds the element for as long as the timer has left to run.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Subscriptions that outlive their element (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`leaks: ${watched} listened-for events, every one of them released`)
