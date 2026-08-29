#!/usr/bin/env node
/**
 * A component that wraps a native element answers to the native element's name.
 *
 * Helix components stand in for platform elements: `helix-select` is a
 * `<select>`, `helix-dialog` is a `<dialog>`. A consumer arrives knowing the
 * platform, and every property the native element has and ours does not is a
 * thing they have to discover is missing. Worse is when the capability exists
 * under a word we invented, because then nothing is missing and nothing is
 * findable.
 *
 * **The audit that produced this found 128 divergences across 33 families**, and
 * it is a script rather than that list because a list goes stale the day a
 * component is edited. Both sources are already in the tree: `lib.dom.d.ts`,
 * which ships with TypeScript, and the manifest the analyzer writes. See 295.
 *
 * **Only the element's own members count.** Comparing against the whole
 * inherited surface would report `accessKey` and `style` on every component and
 * bury the findings. The direct body of an interface declaration is exactly what
 * makes that element that element, so that is what is read.
 *
 * **Input is scoped by type, because `HTMLInputElement` is nine controls in a
 * trench coat.** `accept` belongs to a file input and `valueAsDate` to a date
 * one, and comparing a color picker against all of it reports thirty absences
 * of which two are real. The scopes below follow the attribute table in the
 * HTML specification.
 *
 * **A divergence is excused at the site of the excuse, with a reason.** A switch
 * has no `indeterminate` because a switch is binary, and a file input has no
 * `value` because the native one is a fake path. Those are decisions, and a
 * decision recorded as a silent omission is indistinguishable from an oversight
 * six months later. `EXCUSED` holds them and the reason is the point of it.
 *
 * **Not in `verify` yet, deliberately.** It reports the open findings in 295, so
 * adding it now would make `verify` red on work that has not been done. It joins
 * the gate on the day that row closes.
 *
 * **Events are the same question asked of the other half of the surface.** Two
 * assertions, and the second is the one worth having:
 *
 * - **A native element's events**, which a stand-in should also send. Curated,
 *   because `lib.dom.d.ts` hangs `change` and `input` off `GlobalEventHandlers`
 *   rather than off `<select>`, so which element fires what is not derivable
 *   from it and comes from the HTML specification instead.
 * - **A prefixed event whose verb is already a native event name**, which is a
 *   platform word we renamed. Derived rather than curated, by reading every
 *   `*EventMap` in the DOM library, so it needs no list to keep current and
 *   catches the next one on the day it is written. See 294.
 *
 * Run with `bun run check:api:platform-fidelity`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE, TAG_PREFIX } from './lib/workspace.mjs'

/**
 * TypeScript's DOM library, wherever this platform's binary put it.
 *
 * `typescript` publishes a shim over a per-platform package, so the path holds
 * `darwin-arm64` on a laptop and `linux-x64` on a runner. Globbing the scope is
 * what makes this run in both, and the analyzer's own nested TypeScript is the
 * fallback rather than the first choice: it is pinned to 5.4 for reasons that
 * belong to `cem` and its DOM library is that much older.
 */
const domLibrary = () => {
  const scope = 'node_modules/@typescript'
  let entries = []
  try {
    entries = readdirSync(scope)
  } catch {
    entries = []
  }
  for (const entry of entries) {
    const path = join(scope, entry, 'lib/lib.dom.d.ts')
    try {
      return { path, source: readFileSync(path, 'utf8') }
    } catch {
      /* Next candidate. */
    }
  }
  const fallback =
    'node_modules/@custom-elements-manifest/analyzer/node_modules/typescript/lib/lib.dom.d.ts'
  try {
    return { path: fallback, source: readFileSync(fallback, 'utf8') }
  } catch {
    return undefined
  }
}

/** Property names declared directly in an interface body, methods excluded. */
const ownMembers = (source, name) => {
  const opening = new RegExp(`\\ninterface ${name}\\b[^{]*\\{`).exec(source)
  if (!opening) {
    return undefined
  }
  let at = opening.index + opening[0].length
  const start = at
  let depth = 1
  while (depth > 0 && at < source.length) {
    if (source[at] === '{') {
      depth += 1
    } else if (source[at] === '}') {
      depth -= 1
    }
    at += 1
  }
  const members = new Set()
  /* Carried from the doc comment onto the member it documents, because the
     answer is already in the file being read. `DEPRECATED` below is a hand copy
     of the same fact and drifts; reading the marker leaves that list holding
     only what lib.dom does not mark, which is the half that needs a person. */
  let deprecated = false
  for (const line of source.slice(start, at - 1).split('\n')) {
    const text = line.trim()
    if (text.startsWith('/') || text.startsWith('*')) {
      if (text.includes('@deprecated')) {
        deprecated = true
      }
      continue
    }
    if (text === '') {
      continue
    }
    const property = /^(?:readonly\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*:\s/.exec(text)
    if (property && !text.slice(0, text.indexOf(':')).includes('(')) {
      if (!deprecated) {
        members.add(property[1])
      }
    }
    deprecated = false
  }
  return members
}

/* Three notes on `VOCABULARY` below, which is read from
   `tooling/config/platform-fidelity.json`.

   `propertyGroups` is the attribute table from the HTML specification, by input
   type. `value` and `defaultValue` are in every scope because every input has
   them.

   `tags` says what to call an interface in a message, because the tag derived
   from the interface name (`HTMLTextAreaElement` is `<textarea>`) is wrong for
   three of them. `HTMLImageElement` derives `<image>`, which is not a
   misspelling of `<img>` but `SVGImageElement`, a different element with a
   different surface, so a reader sent to look up `x` and `y` lands on the wrong
   spec. `HTMLOListElement` derives `<olist>`, which is nothing.
   `HTMLMediaElement` has no element at all, being the base `<video>` and
   `<audio>` share, and saying so is more use than inventing `<media>`.

   `native` maps `Radio` and `Toggle` to `HTMLOptionElement`, not
   `HTMLInputElement`, which produced a false finding that nearly became a
   rename. Both extend `HelixElement` and not `HelixFormElement`: the group owns
   the value and each one is a choice inside it, which is `<option>`'s shape and
   not `<input type="radio">`'s. So `selected` is the platform's word here,
   matching `<option selected>`, and `checked` would have been the divergence. A
   mapping is a claim about what a component *is*, and a wrong one reads as a
   finding. */

/**
 * What a shadow component cannot mirror, whatever the element.
 *
 * Live collections and the validity surface are two of the three groups. `rows`
 * and `options` hand back a live `HTMLCollection` of light-DOM children, which a
 * component that renders its own tree does not have; `validity` and
 * `validationMessage` belong to `ElementInternals`, which `HelixFormElement`
 * already owns. Neither is a fidelity question and reporting them is noise.
 *
 * **The third is an IDREF, and `list` is the whole of it.** `<input list="x">`
 * resolves `x` in the input's own tree, and the input is inside a shadow root
 * while the `<datalist>` a consumer wrote is not, so forwarding the attribute
 * resolves nothing and would look exactly like support. This repository already
 * states the rule for `aria-labelledby`, which is the same wall; the difference
 * is that a component can put the label inside and cannot put the consumer's
 * datalist there. `Combobox` is this library's answer to the same question and
 * works across the boundary because it renders the list itself.
 */
const UNMIRRORABLE = new Set([
  'audioTracks',
  'buffered',
  'caption',
  'error',
  'form',
  'labels',
  'length',
  'list',
  'mediaKeys',
  'networkState',
  'options',
  'played',
  'readyState',
  'remote',
  'rows',
  'seekable',
  'selectedOptions',
  'sinkId',
  'srcObject',
  'tBodies',
  'textTracks',
  'tFoot',
  'tHead',
  'validationMessage',
  'validity',
  'videoTracks',
  'willValidate',
])

/** Presentational attributes the platform itself deprecated. Not a gap. */
const DEPRECATED = new Set([
  'align',
  'bgColor',
  'border',
  'cellPadding',
  'cellSpacing',
  'ch',
  'chOff',
  'color',
  'compact',
  'frame',
  'height',
  'hspace',
  'isMap',
  'longDesc',
  'lowsrc',
  'noShade',
  'noWrap',
  'rules',
  'size',
  'sortable',
  'summary',
  'useMap',
  'vAlign',
  'vspace',
  'width',
])

/* `EXCUSED` holds divergences that are decisions, each with the reason it was
   taken. A reason there is load-bearing: without one it is a mute allowlist, and
   an allowlist nobody can read the argument for is where a real finding goes to
   be forgotten. */

/** Where a family's headless source lives, for the hardcoded check below. */
const headlessSource = (tag) => {
  const family = tag.replace(/^helix-/, '')
  for (const folder of [family, family.replace(/-([a-z]+)$/, '/$1')]) {
    for (const file of [`${family}-root.ts`, `${family}.ts`]) {
      try {
        return readFileSync(join(SOURCE.headless, folder, 'root', file), 'utf8')
      } catch {
        /* Next shape. */
      }
    }
  }
  return ''
}

/**
 * Every event name an *element* can send, read out of the DOM library.
 *
 * **Scoped to the element maps, and that scoping is the whole accuracy of it.**
 * Reading every `*EventMap` catches `open` from `WebSocketEventMap`, `navigate`
 * from the Navigation API and `complete` from IndexedDB, none of which an
 * element ever sends, so `helix-open` would be reported as shadowing a word
 * nothing on a page uses. The maps below are the ones an element's own
 * listeners are typed by.
 */
const ELEMENT_EVENT_MAPS = [
  'DocumentAndElementEventHandlersEventMap',
  'ElementEventMap',
  'GlobalEventHandlersEventMap',
  'HTMLElementEventMap',
  'HTMLMediaElementEventMap',
  'HTMLVideoElementEventMap',
]

const nativeEventNames = (source) => {
  const names = new Set()
  for (const map of ELEMENT_EVENT_MAPS) {
    const found = new RegExp(`\\ninterface ${map} \\{([\\s\\S]*?)\\n\\}`).exec(source)
    if (!found) {
      continue
    }
    for (const entry of found[1].matchAll(/^\s*"([a-z]+)":/gm)) {
      names.add(entry[1])
    }
  }
  return names
}

/* `EXPECTED_EVENTS` is the events a native element sends, which its stand-in
   should send too. From the HTML specification rather than from `lib.dom.d.ts`,
   which files `change` and `input` under `GlobalEventHandlers` and so cannot say
   which element fires them. Deliberately short: the events a consumer reaches
   for first, not every event the element can possibly send.

   `EXCUSED_EVENTS` is prefixed events whose verb matches a native name for a
   reason. The bar is that the two mean different things, not that ours is
   nicer. */

const library = domLibrary()
if (!library) {
  console.error(
    'platform-fidelity: no `lib.dom.d.ts` under `node_modules/@typescript`, so nothing could be\n' +
      '  checked. It ships with TypeScript, so this means `bun install` has not run.\n',
  )
  process.exit(1)
}

let manifest
try {
  manifest = JSON.parse(readFileSync('helix/styled/custom-elements.json', 'utf8'))
} catch {
  console.error('platform-fidelity: no styled manifest. Run `bun run analyze` first.\n')
  process.exit(1)
}

/* Attribute case and property case are the same surface, so both spellings of
   every name count as declared: `clear-label` answers for `clearLabel`. */
const declared = new Map()
const dispatched = new Map()
for (const module of manifest.modules ?? []) {
  for (const declaration of module.declarations ?? []) {
    const tag = declaration.tagName
    if (!tag) {
      continue
    }
    const names = new Set()
    for (const member of declaration.members ?? []) {
      /* Public only, and the omission of this was hiding the fault it is meant
         to find. A private field satisfies a name comparison while a consumer
         cannot reach it, so `Video` counted as having `duration` on the strength
         of a `private duration` it paints and never publishes, and was flagged
         for `currentTime` only because its own mirror happens to be spelled
         `position`. Getting the name wrong was the whole of what the check
         could see. Thirty-nine of Video's seventy-eight fields are private. */
      if (
        member.kind === 'field' &&
        member.privacy !== 'private' &&
        member.privacy !== 'protected'
      ) {
        names.add(member.name)
      }
    }
    for (const attribute of declaration.attributes ?? []) {
      names.add(attribute.name)
    }
    for (const name of [...names]) {
      names.add(name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()))
    }
    declared.set(tag, names)
    dispatched.set(tag, new Set((declaration.events ?? []).map((event) => event.name)))
  }
}

const problems = []
const shadowed = new Map()
let compared = 0
let events = 0

/**
 * The vocabulary, which is data rather than rule.
 *
 * Which native interface each family wraps, which property group comes with it,
 * what is excused and why. The script is the argument; this file is the subject
 * it argues about, and a consumer with their own components has their own
 * subject.
 *
 * `properties` names a group rather than inlining one, because four families
 * share `temporal` and two share `color`, and a list written four times is four
 * places to forget.
 *
 * Read back into the shape the checks expect, `[interface, properties, also]`.
 */
const VOCABULARY = JSON.parse(
  readFileSync(join(import.meta.dirname, '../config/platform-fidelity.json'), 'utf8'),
)
const {
  excused: EXCUSED,
  excusedEvents: EXCUSED_EVENTS,
  expectedEvents: EXPECTED_EVENTS,
} = VOCABULARY
const TAGS = VOCABULARY.tags
const NATIVE = Object.fromEntries(
  Object.entries(VOCABULARY.native).map(([tag, one]) => [
    tag,
    [one.interface, one.properties && VOCABULARY.propertyGroups[one.properties], one.also],
  ]),
)

for (const [tag, [name, scope, extra]] of Object.entries(NATIVE)) {
  const ours = declared.get(tag)
  if (!ours) {
    problems.push(
      `${tag}: named here as standing in for \`${name}\` and absent from the manifest. Either the ` +
        'family was renamed and this map was not, or it was removed and this entry should go with it.',
    )
    continue
  }

  let native = ownMembers(library.source, name)
  if (!native) {
    problems.push(
      `${tag}: \`${name}\` is not an interface in ${library.path}. The name is wrong, or the DOM ` +
        'library has moved it.',
    )
    continue
  }
  if (extra) {
    native = new Set([...native, ...(ownMembers(library.source, extra) ?? [])])
  }

  const source = headlessSource(tag)
  const excused = EXCUSED[tag] ?? {}

  for (const property of [...native].sort()) {
    if (scope && !scope.includes(property)) {
      continue
    }
    if (UNMIRRORABLE.has(property) || DEPRECATED.has(property)) {
      continue
    }
    compared += 1
    if (ours.has(property) || excused[property]) {
      continue
    }
    /* Hardcoded is worse than absent: the consumer cannot reach it at all, and
       the component has taken the decision on their behalf without saying so. */
    const forced = new RegExp(`${property}="[^"]*"`).exec(source)
    problems.push(
      forced
        ? `${tag}: \`${property}\` is not a property and the template hardcodes \`${forced[0]}\`, so ` +
            'a consumer cannot reach it at all. Expose it, defaulting to what the template forces.'
        : `${tag}: \`<${TAGS[name] ?? name.replace(/^HTML|Element$/g, '').toLowerCase()}>\` has \`${property}\` and this ` +
            'does not. Mirror it, or add it to `EXCUSED` with the reason it is not wanted.',
    )
  }

  for (const property of Object.keys(excused)) {
    if (ours.has(property)) {
      problems.push(
        `${tag}: \`${property}\` is excused as *"${excused[property]}"* and the component declares it ` +
          'anyway. Drop the excuse.',
      )
    }
  }
}

/* A stand-in sends what the element it stands in for sends. */
for (const [tag, expected] of Object.entries(EXPECTED_EVENTS)) {
  const sends = dispatched.get(tag)
  if (!sends) {
    continue
  }
  for (const event of expected) {
    events += 1
    if (!sends.has(event)) {
      problems.push(
        `${tag}: a native \`${event}\` is what a consumer binds with \`on${event}\` in HTML and ` +
          `\`on${event[0].toUpperCase()}${event.slice(1)}\` in React, and this sends none. An inline ` +
          'handler attribute cannot name a prefixed event at all, so there is no spelling that works ' +
          'without it. See 294.',
      )
    }
  }
}

/* A prefixed event whose verb the platform already owns is a rename.
   Reported once per event rather than once per tag: one such rename is a single
   decision taken across every component that sends the event, and a line per
   family would bury every other finding under it. */
const knownEvents = nativeEventNames(library.source)
for (const [tag, sends] of dispatched) {
  for (const event of sends) {
    if (!event.startsWith(TAG_PREFIX)) {
      continue
    }
    const verb = event.slice(TAG_PREFIX.length)
    if (!knownEvents.has(verb) || EXCUSED_EVENTS[event]) {
      continue
    }
    shadowed.set(event, [...(shadowed.get(event) ?? []), tag])
  }
}

for (const [event, tags] of [...shadowed].sort()) {
  const verb = event.slice(TAG_PREFIX.length)
  const named = tags.sort().slice(0, 3).join(', ')
  problems.push(
    `\`${event}\` says what the platform already says with \`${verb}\`, on ${tags.length} ` +
      `${tags.length === 1 ? 'family' : 'families'} (${named}${tags.length > 3 ? ', and more' : ''}). ` +
      `Either it means something the native \`${verb}\` does not, in which case say so in ` +
      '`EXCUSED_EVENTS`, or it is a word we invented for something already named. See 294.',
  )
}

if (problems.length > 0) {
  console.error(
    `Places a component and the element it stands in for disagree, unexcused (${problems.length}):\n`,
  )
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `platform-fidelity: ${compared} native properties and ${events} native events across ` +
    `${Object.keys(NATIVE).length} families, every one mirrored or excused with a reason, and no ` +
    'prefixed event shadowing a name the platform already owns',
)
