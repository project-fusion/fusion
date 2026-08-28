#!/usr/bin/env node
/**
 * A property that mirrors a platform attribute answers to the platform's spelling.
 *
 * **This exists because the library answered the question two ways at once.**
 * A camelCase property needs an explicit `attribute:` or Lit lowercases the
 * name rather than dash-casing it, so every one of them is a decision somebody
 * made. Measured 27 Aug 2026 over every declaration in `helix/`: thirteen kept
 * the name HTML uses and five dash-cased a word the platform writes as one.
 *
 * ```
 * kept        closedby commandfor crossorigin dirname formaction formenctype
 *             formmethod formnovalidate formtarget maxlength minlength
 *             readonly referrerpolicy
 * dash-cased  disable-picture-in-picture disable-remote-playback
 *             fetch-priority plays-inline read-only
 * ```
 *
 * `readonly` was on both lists, which is what makes this a defect rather than a
 * preference: one library shipped both spellings, `readonly` on `Rating` and
 * `read-only` on the eight other fields, and each was inert on the other's
 * families.
 *
 * **The failure is silent in the direction that matters.** `<helix-input
 * readonly>` is what anybody who has written HTML types. It parsed to no
 * property, the field stayed editable, and nothing warned: the same shape the
 * area rules already record for a camelCase property with no `attribute` at
 * all. A consumer cannot discover the dash-cased spelling by knowing HTML,
 * which is the entire premise of standing in for a platform element.
 *
 * **Not `check:api:platform-fidelity`, which cannot see this.** That one compares
 * IDL *members* against `lib.dom.d.ts` and `fetchPriority` is present and
 * correctly named, so it passes while `fetchpriority` does nothing. The
 * divergence is in the content attribute, and the content attribute is the half
 * a consumer writes.
 *
 * **The list is curated rather than derived, and that is the honest shape.**
 * `lib.dom.d.ts` gives IDL names and not content-attribute names, and the two
 * differ exactly where this check has something to say, so deriving it from the
 * DOM library would need the mapping this file *is*. It is the HTML
 * specification's attribute tables, for the members Helix actually mirrors, and
 * a name absent from it is simply not checked: a property this library invented
 * is free to be dash-cased and most of them are (`default-value`, `show-value`,
 * `back-label`).
 *
 * Run with `bun run check:api:attribute-names` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE } from './lib/workspace.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIERS = [SOURCE.core, SOURCE.headless, SOURCE.sandbox, SOURCE.styled]

/**
 * IDL member to the content attribute HTML spells it with.
 *
 * Only members that exist on a platform element. Anything not here is this
 * library's own and is dash-cased by the ordinary rule.
 */
const PLATFORM = {
  autoComplete: 'autocomplete',
  crossOrigin: 'crossorigin',
  dirName: 'dirname',
  disablePictureInPicture: 'disablepictureinpicture',
  disableRemotePlayback: 'disableremoteplayback',
  fetchPriority: 'fetchpriority',
  formAction: 'formaction',
  formEnctype: 'formenctype',
  formMethod: 'formmethod',
  formNoValidate: 'formnovalidate',
  formTarget: 'formtarget',
  maxLength: 'maxlength',
  minLength: 'minlength',
  noValidate: 'novalidate',
  playsInline: 'playsinline',
  readOnly: 'readonly',
  referrerPolicy: 'referrerpolicy',
  useMap: 'usemap',
}

/**
 * Members deliberately answering to something else, with the reason.
 *
 * `defaultMuted` is the platform's own trick rather than a divergence from it:
 * the `muted` content attribute sets the *default* muted state and the IDL
 * member for that is `defaultMuted`, so this is the mapping HTML itself makes.
 */
const EXCUSED = {
  defaultMuted: 'muted',
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

/* The decorator and the member it sits on. Options may hold nested parens, so
   the inner group tolerates one level of them, which is what `converter: {…}`
   and `type: Boolean` between them need. */
const DECLARATION = /@property\(((?:[^()]|\([^()]*\))*)\)\s*\n\s*(?:override\s+)?(?:get\s+)?(\w+)/g

const problems = []
for (const tier of TIERS) {
  for (const file of walk(join(ROOT, tier))) {
    const source = readFileSync(file, 'utf8')
    for (const [, options, member] of source.matchAll(DECLARATION)) {
      const expected = PLATFORM[member]
      if (expected === undefined) {
        continue
      }
      const declared = /attribute:\s*'([^']+)'/.exec(options)?.[1]
      if (EXCUSED[member] !== undefined && declared === EXCUSED[member]) {
        continue
      }
      if (declared === undefined) {
        /* No `attribute:` at all. Lit lowercases the property name, which is
           right for a single word and wrong for every name in the table above:
           `readOnly` would answer to `readonly` by accident and `fetchPriority`
           to `fetchpriority` the same way. Correct by luck is still correct,
           so only a name Lit would get wrong is reported. */
        if (member.toLowerCase() !== expected) {
          problems.push(
            `${relative(ROOT, file)}: \`${member}\` declares no \`attribute\`, so Lit lowercases it ` +
              `to \`${member.toLowerCase()}\`. HTML spells this \`${expected}\`. Declare it.`,
          )
        }
        continue
      }
      if (declared !== expected) {
        problems.push(
          `${relative(ROOT, file)}: \`${member}\` answers to \`${declared}\` and HTML spells it ` +
            `\`${expected}\`. A consumer who knows the platform writes the platform's name, and a ` +
            'wrong one parses to no property and warns about nothing.',
        )
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Attributes diverging from the platform (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  process.exit(1)
}

console.log(
  `check:api:attribute-names: every mirrored attribute answers to the platform's spelling (${Object.keys(PLATFORM).length} names known).`,
)
