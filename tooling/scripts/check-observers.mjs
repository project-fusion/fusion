#!/usr/bin/env node
/**
 * Holds an observer built once against a lifecycle that runs many times.
 *
 * **`firstUpdated` runs once for the life of an element and
 * `disconnectedCallback` runs every time it moves.** A component that builds an
 * observer in the first and tears it down in the second works perfectly until
 * something reorders the DOM, and then comes back permanently dead: the
 * observer is gone, nothing rebuilds it, and the component goes on rendering.
 * No error, no warning, and the symptom is a feature that silently stopped.
 *
 * A framework moves nodes for ordinary reasons. React reorders a list, a router
 * swaps a subtree, a drag lands a panel somewhere else. `Outline` hit this and
 * wrote the fix down: rebuild in `connectedCallback`, guarded on `hasUpdated`,
 * because the first connection happens before the first render and there is
 * nothing to watch yet.
 *
 * So the rule is symmetry. **If `disconnectedCallback` tears an observer down,
 * `connectedCallback` has to be able to build one.** Directly, or through a
 * method that does, which is the shape most of them use.
 *
 * **What it deliberately does not check** is whether the rebuild is correct, or
 * guarded, or observes the same targets. It asks whether the teardown has a
 * counterpart at all, which is the failure that actually shipped four times.
 *
 * Run with `bun run check:api:observers` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['helix/headless/src', 'helix/styled/src']
const OBSERVER = /new\s+(?:Intersection|Mutation|Resize|Performance)Observer\b/

const sources = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.ts') && !entry.includes('.spec.')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

const withoutComments = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
    .replaceAll(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length))

/** The body of a named method, by brace matching from its signature. */
const body = (text, name) => {
  /* Not preceded by a dot, or this finds the *call* rather than the
     declaration. `connectedCallback` containing `this.watch()` matched its own
     call site, and the body extracted was the two characters after it, so a
     component that rebuilds correctly was reported as never rebuilding. Caught
     on `Video.Playlist.Menu`, which does exactly the right thing. */
  const signature = new RegExp(
    `(?<![.\\w])(?:private|protected|public|override|readonly|\\s)*${name}\\s*\\(`,
  )
  const found = signature.exec(text)
  if (!found) {
    return ''
  }
  let index = found.index + found[0].length - 1
  let parens = 0
  for (; index < text.length; index += 1) {
    if (text[index] === '(') {
      parens += 1
    } else if (text[index] === ')') {
      parens -= 1
      if (parens === 0) {
        break
      }
    }
  }
  index = text.indexOf('{', index)
  if (index === -1) {
    return ''
  }
  let depth = 0
  const start = index
  for (; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1
    } else if (text[index] === '}') {
      depth -= 1
      if (depth === 0) {
        break
      }
    }
  }
  return text.slice(start, index + 1)
}

/* Whether a body starts watching again, following one level of `this.method()`.
 *
 * **`observe` and not `new`, which is the whole question.** An observer that
 * exists and watches nothing is exactly as dead as one that does not exist, and
 * the two failures are reached from opposite directions. `Sandbox` holds its
 * observer in a field, so the object outlives a disconnect and only the
 * registration is lost. `ScrollArea` does the reverse: it builds a fresh
 * observer in `connectedCallback` and registers its targets in `firstUpdated`,
 * which never runs again, so a reconnected scroll area has a new observer
 * watching nothing at all.
 *
 * This asked for `new` *or* `observe` at first and passed `ScrollArea` on the
 * `new`, which is a check agreeing with the half of the code that was fine. The
 * registration is the thing that has to survive, so that is the thing to ask
 * for.
 *
 * One level rather than a full graph, because every component in the library
 * calls the builder directly from the lifecycle hook, and a deeper walk would be
 * reach nothing has asked for. */
const WATCHES = /\.observe\(/

const builds = (text, source) => {
  if (WATCHES.test(source)) {
    return true
  }
  for (const [, called] of source.matchAll(/this\.(\w+)\s*\(/g)) {
    if (WATCHES.test(body(text, called))) {
      return true
    }
  }
  return false
}

const problems = []
let watching = 0

for (const root of ROOTS) {
  for (const file of sources(root)) {
    const text = withoutComments(readFileSync(file, 'utf8'))
    if (!OBSERVER.test(text)) {
      continue
    }
    const teardown = body(text, 'disconnectedCallback')
    if (!/\.disconnect\(\)/.test(teardown)) {
      continue
    }
    watching += 1
    if (!builds(text, body(text, 'connectedCallback'))) {
      problems.push(
        `${file}: disconnects an observer and never observes again. \`firstUpdated\` runs once ` +
          'and `disconnectedCallback` runs on every move, so this watches nothing after a reorder. ' +
          'Rebuilding the observer is not enough on its own: it has to be registered on something.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Observers torn down with nothing to rebuild them (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `observers: ${watching} components tear an observer down, every one registering again on reconnect`,
)
