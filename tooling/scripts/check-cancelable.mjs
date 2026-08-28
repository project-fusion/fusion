#!/usr/bin/env node
/**
 * An event that can be refused says so, and one that cannot does not claim it.
 *
 * **The gap this closes is a sentence, and a sentence is the whole interface
 * here.** `requestChange` dispatches before it applies, so a cancelable event is
 * the consumer's only way to take a decision, and it is also the one moment when
 * `currentTarget` still holds the *previous* state. Which of those two things a
 * consumer believes they are holding is decided entirely by the `@event` line,
 * because nothing in the type says it: `HelixSelectEvent` and `HelixCompleteEvent`
 * are both `CustomEvent` subclasses and only one of them can be refused.
 *
 * Measured 28 Aug 2026 across the two tiers: `Pagination` declares
 * `helix-navigate` as *"Fired before the page changes, and cancelable. The only
 * way to refuse one"*, and `Carousel` routes its state change through the
 * identically cancelable `helix-select` while declaring it *"Fired when the
 * slide in view changes"*. `Steps` does the same with `helix-before-activate`,
 * *"Fired when the active step changes"*. Same mechanism, opposite
 * documentation, in one library.
 *
 * Two ways to be wrong and both are reported:
 *
 * - **Cancelable and not saying so.** A consumer reads a notification, binds a
 *   handler to learn what happened, and reads a stale `currentTarget`. Worse, a
 *   handler that calls `preventDefault()` for an unrelated reason silently
 *   freezes the component, which is what `Carousel` does today: refusing
 *   `helix-select` stops the slide moving and nothing says it would.
 * - **Saying so and not being cancelable.** A consumer writes a veto that never
 *   takes, which is the failure this repository keeps naming: valid code, no
 *   error, and the feature quietly not happening.
 *
 * The event's own class is the authority rather than a list here, so a class
 * that changes its `cancelable` moves every component that dispatches it in one
 * edit and this check follows.
 *
 * Run with `bun run check:api:cancelable` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const EVENTS = 'helix/core/src/events/events.ts'
const TIERS = ['helix/headless/src', 'helix/styled/src', 'helix/sandbox/src']

/**
 * Whether each event class is cancelable, read from the class that builds it.
 *
 * The constructor is the only place this is decided, and every one of them
 * passes the flag literally, so the parse is a scan rather than an evaluation.
 */
const cancelable = new Map()
const events = readFileSync(join(ROOT, EVENTS), 'utf8')
for (const match of events.matchAll(/export class (\w+) extends [^{]*\{([\s\S]*?)\n\}/g)) {
  const [, name, body] = match
  const flag = /cancelable:\s*(true|false)/.exec(body)
  if (flag) {
    cancelable.set(name, flag[1] === 'true')
  }
}
if (cancelable.size === 0) {
  console.error('check-cancelable: parsed no event classes, refusing to pass vacuously')
  process.exit(1)
}

const walk = function* (dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      yield* walk(path)
    } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
      yield path
    }
  }
}

/** `@event {SomeEvent} the-name - The description.` */
const DECLARATION = /@event\s*\{(\w+)\}\s*([\w-]+)\s*-\s*(.+)/g
/* "cancelable" or "refuse", either of which tells a reader the decision is
   theirs. The word is what matters rather than the phrasing, so a component
   is free to say it in its own voice. */
const SAYS_SO = /cancelab|refus|veto/i

const problems = []
for (const tier of TIERS) {
  for (const file of walk(join(ROOT, tier))) {
    const source = readFileSync(file, 'utf8')
    for (const [, className, eventName, description] of source.matchAll(DECLARATION)) {
      const can = cancelable.get(className)
      if (can === undefined) {
        continue
      }
      const claims = SAYS_SO.test(description)
      if (can && !claims) {
        problems.push(
          `${relative(ROOT, file)}: \`${eventName}\` is cancelable and its description does not say so. ` +
            'A consumer reads it as a notification, binds a handler to learn what happened, and finds ' +
            '`currentTarget` still holding the previous state. Say that refusing it takes the decision.',
        )
      }
      if (!can && claims) {
        problems.push(
          `${relative(ROOT, file)}: \`${eventName}\` describes itself as refusable and ` +
            `\`${className}\` is not cancelable, so a consumer's \`preventDefault()\` does nothing ` +
            'and nothing says so.',
        )
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Events whose description disagrees with their class (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  process.exit(1)
}

console.log(
  `cancelable: ${cancelable.size} event classes, every declaration agreeing with the class it names.`,
)
