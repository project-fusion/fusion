#!/usr/bin/env node
/**
 * A dispatched event has to be declared, and a declared event has to be dispatched.
 *
 * `@event` is how a component publishes an event. It is what the React
 * generator reads to type a handler, what the reference page lists, and what a
 * consumer greps for. An event dispatched without one is a channel nobody is
 * told about: `Tabs` and `Toggle.Group` each dispatch the cancelable
 * `helix-change` that is the *only* way to refuse a change, and neither
 * declared it, so the refusal path was undiscoverable from the docs.
 *
 * Third of its shape after `check:hooks` and `check:parts`, and the same
 * argument: nothing about a missing `@event` fails, warns, or looks wrong.
 *
 * **Declared on the class that dispatches, or on one it extends.** A styled
 * component almost never dispatches anything of its own, and an event announced
 * by a mixin belongs to every component that applies it, so both the `extends`
 * chain and applied mixins are followed.
 *
 * Run with `bun run check:events` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styled/src', 'helix/sandbox/src']

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else {
      found.push(path)
    }
  }
  return found
}

const isSource = (path) =>
  extname(path) === '.ts' && !path.endsWith('.css.ts') && !path.includes('.spec.')

/**
 * The event class names, mapped to what they dispatch as.
 *
 * Read from `events.ts` rather than assumed, because the name a class carries
 * is the contract and a guess from the class name would be one more thing that
 * can drift.
 */
const names = new Map()
const eventSource = readFileSync('helix/core/src/events/events.ts', 'utf8')
for (const [, cls, name] of eventSource.matchAll(
  /export class (Helix\w*Event)[\s\S]*?static readonly eventName = '([a-z-]+)'/g,
)) {
  names.set(cls, name)
}
if (names.size === 0) {
  /* Loud rather than empty. Read the other way, every construction resolved to
     `undefined`, `filter(Boolean)` dropped them all, and the check reported all
     fifty-eight declared events as never dispatched: a total failure that
     looked exactly like a total success would have if the map were built and
     nothing was wrong. */
  console.error('events: no event names found in events.ts, so nothing could be checked')
  process.exit(1)
}

/**
 * Every event class reaches `HTMLElementEventMap`, and the registry is how.
 *
 * That augmentation is derived from `registry` rather than written beside it,
 * so the map cannot disagree with the classes. What is left is one step a
 * person can still forget: a class exported and dispatched and never added to
 * the object. Forgotten, `addEventListener` types it as a bare `Event` and a
 * consumer reaches `detail` through a cast, which is what happened to
 * `helix-filter` and `helix-navigate` while the map was kept by hand.
 */
const registered = new Set(
  (eventSource.match(/const registry = \{([\s\S]*?)\} as const/)?.[1] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
)
/**
 * And every registered class is exported, which is a third hand-kept list.
 *
 * `helix/core/src/index.ts` re-exports the event classes by name. Adding
 * `HelixToggleEvent` to the registry, the map and the dispatch site left it out
 * of the barrel, and the failure was one tier away: `helix/core` compiled, and
 * `helix/headless` could not import the class it was told to dispatch. The
 * registry ended the drift between the classes and the map; this ends it
 * between the classes and what a consumer can import.
 */
const barrel = readFileSync('helix/core/src/index.ts', 'utf8')
const unexported = [...names.keys()].filter((cls) => !new RegExp(`\\b${cls}\\b`).test(barrel))
if (unexported.length > 0) {
  console.error(`Event classes missing from the core barrel (${unexported.length}):\n`)
  for (const cls of unexported) {
    console.error(
      `  ${cls} is registered and is not exported from helix/core/src/index.ts, so no other ` +
        'package can import it, and the one that dispatches it cannot name its type.\n',
    )
  }
  process.exit(1)
}

const unregistered = [...names.keys()].filter((cls) => !registered.has(cls))
if (unregistered.length > 0) {
  console.error(`Event classes missing from the registry in events.ts (${unregistered.length}):\n`)
  for (const cls of unregistered) {
    console.error(
      `  ${cls} is exported and is not in \`registry\`, so \`HTMLElementEventMap\` does not carry ` +
        'it. `addEventListener` types it as a bare `Event`, nothing fails, and a consumer reads ' +
        '`detail` through a cast.\n',
    )
  }
  process.exit(1)
}

const components = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier).filter(isSource)) {
    if (path.endsWith('events/events.ts')) {
      continue
    }
    const text = readFileSync(path, 'utf8')
    const mixin = text.match(/export const (Mixin\w+)\s*=/)
    const declaration = text.match(/export class (\w+)(?: extends ([\s\S]*?))?\s*\{/)
    if (!declaration && !mixin) {
      continue
    }
    const [, name, base = ''] = declaration ?? [undefined, mixin[1], '']
    const declared = [...text.matchAll(/@event\s+\{(\w+)\}\s+([\w-]+)/g)].map((m) => m[2])
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    /* Any `new HelixSomethingEvent(...)`, not only one inside a `dispatchEvent`.
       Half of them are built in a factory the controlled-change util dispatches
       for you, `event: (value) => new HelixChangeEvent(...)`, and matching the
       dispatch alone missed every one: the check passed while `Tabs` and
       `Toggle.Group` still had the undeclared `helix-change` the audit found.
       These classes exist to be dispatched and are constructed nowhere else,
       which is what makes the looser match the accurate one. */
    const dispatched = [...code.matchAll(/new (Helix\w*Event)\s*\(/g)]
      .map((m) => names.get(m[1]))
      .filter(Boolean)
    /* And any hand-rolled `new Event('helix-…')` or `new CustomEvent(…)`, which
       this matched none
       of. `Tour.Stop` dispatched `helix-tour-ask` that way: it bubbled, it was
       composed, a consumer could listen for it, and it appeared in no manifest
       and no documentation, because the check only ever asked about the event
       classes. An event nobody can find is not API, and the way to notice is to
       hold the raw form to the same rule.
     *
     * `Event` as well as `CustomEvent`, and that took two goes. The first
       widening covered `CustomEvent` alone, so `ColorPicker`'s
       `helix-sample-start` and `helix-sample-end`, dispatched as bare `Event`s
       and bound by `ColorInput`, stayed invisible: audible to a consumer,
       absent from the manifest, the React types and the docs page. Widening for
       the constructor somebody happened to think of is how a check comes to
       cover one case. */
    for (const [, name] of code.matchAll(
      /new (?:Custom)?Event(?:<[^>]*>)?\s*\(\s*['"`](helix-[\w-]+)['"`]/g,
    )) {
      dispatched.push(name)
    }
    components.set(name, {
      bases: [...base.matchAll(/(\w+)/g)].map((m) => m[1]),
      declared,
      dispatched,
      // Only a registered element publishes anything. A mixin and a base class
      // are where events come from; the element is where they are promised.
      element: /@customElement\(/.test(text),
      path,
    })
  }
}

const inherited = (name, key, seen = new Set()) => {
  const entry = components.get(name)
  if (!entry || seen.has(name)) {
    return []
  }
  seen.add(name)
  return [...entry[key], ...entry.bases.flatMap((base) => inherited(base, key, seen))]
}

const problems = []

for (const [name, entry] of components) {
  if (!entry.element) {
    continue
  }
  const declared = new Set(inherited(name, 'declared'))
  /* The whole chain, not this class alone. Half of what an element emits comes
     from a mixin, `MixinControllerActive` being the cancelable `helix-change`
     that is the only way to refuse a change, and checking the class's own
     constructions saw none of it. */
  const dispatched = new Set(inherited(name, 'dispatched'))
  for (const event of dispatched) {
    if (!declared.has(event)) {
      problems.push(
        `${entry.path}: ${name} dispatches \`${event}\` and no \`@event\` declares it. ` +
          'It reaches no manifest, no reference page and no generated React prop, so a ' +
          'consumer has no way to find the channel except by reading this file.',
      )
    }
  }
  /* One direction only, and the other was tried.
   *
   * "Declared and never dispatched here" has two legitimate shapes and no way
   * to tell them from a fault. A parent declares the bubbling event its own
   * children send, which `Tabs` does for `helix-select` and says so in the tag;
   * and a form control declares the native `change` it relays, which is a plain
   * `Event` and not one of these classes at all. Enforcing it flagged fifteen
   * of those and nothing else.
   *
   * The direction that matters has no exception: an event a component sends and
   * does not declare is a channel a consumer cannot find. */
}

if (problems.length > 0) {
  console.error(`Events that are declared or dispatched but not both (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const total = [...components.values()].reduce((count, one) => count + one.declared.length, 0)
console.log(`events: ${total} declared events, every one dispatched, and every dispatch declared`)
