#!/usr/bin/env node
/**
 * Holds the words that name a *role* to one spelling each.
 *
 * **This is `check:axes` one stage later and on a bigger surface.** That check
 * was written because `appearance` had become one word for four questions; this
 * one is written because the reverse happened to parts. Counted across both
 * tiers, 204 part names serve 92 families, and nine of those words meant "the
 * box in the middle": `surface` in five families, `content` in eleven, `panel`
 * in three, `container` in two, `box` in two, `viewport` in two, and one each
 * for `body` and `wrapper`. `drawer` used both `panel` and `content`;
 * `accordion` used both `content` and `container`.
 *
 * A part name is the most coupled door a consumer goes through, and it is the
 * last one `overriding-a-component.mdx` tells them to try. Twenty vocabularies
 * for twenty components is what makes it the last resort rather than the
 * structure of it.
 *
 * **Only the generic words are registered, and that is the whole design.** A
 * `thumb`, a `terminus`, a `swatch` or a `weekday` names a thing that component
 * actually has, and no registry should have an opinion about it. What drifts is
 * the words that name a *position* rather than a thing, because every component
 * has a box in the middle and nothing tells the next one what to call it. Those
 * are here; everything else is the escape hatch, the way `variant` is on the
 * axes.
 *
 * **The sandbox is out of scope**, on the same grounds `check:parts` gives for
 * not requiring it to document parts at all: its internals are not API and
 * nobody reskins a dev tool.
 *
 * Run with `bun run check:vocabulary` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { TIERS, walk, withoutComments } from './lib/compositions.mjs'

/**
 * The registered words, each with the one question it answers.
 *
 * Two of these were arrived at by renaming rather than by choosing, and both
 * were the component telling on itself. `Menu` published its floating panel as
 * `menu`, described in its own JSDoc as "the floating panel the menu is drawn
 * on", which is the sentence five other families spell `surface`. `Megamenu`
 * published `panel` while the accessor reading it, one file over, is called
 * `surface`.
 */
const ROLES = {
  /** The drawn control, where the host is not it. Checkbox and Radio. */
  box: 'the drawn control, where the host is not it',
  /** An element's own outer box, where it needs one to lay itself out. */
  container: "an element's own outer box",
  /** A region the consumer fills. Eleven families, and the default. */
  content: 'a region the consumer fills',
  /** A region the component switches between, or a sheet anchored to an edge. */
  panel: 'a region switched between, or a sheet anchored to an edge',
  /** A floating panel drawn over the page: a popover, a menu, a dropped list. */
  surface: 'a floating panel drawn over the page',
  /** A scrollport, whose scroll position the component reads. */
  viewport: 'a scrollport the component reads the position of',
}

/**
 * Spellings a registered word already covers, each naming its replacement.
 *
 * **A permanent deny-list, not a queue.** `UNRESOLVED` below is the queue and
 * empties as the work is done; this one only grows, because the point of
 * recording that `wrapper` means `container` is that the next person reaching
 * for it is stopped rather than told the entry is stale. The first version of
 * this file deleted an entry nothing rendered and reported itself for holding
 * one, which was the check applying the wrong half of its own rule.
 *
 * `wrapper` was the library's only one, in `video-playlist`'s item, doing
 * exactly what `container` does in `accordion` and `card`. It is renamed, and
 * this is what keeps it renamed.
 */
const REFUSED = {
  wrapper: 'container',
}

/**
 * Words doing something the registry has no word for, each with what it is.
 *
 * Same contract as `check:axes`'s `UNSWEPT`: this names the work rather than
 * blocking on it, and an entry nothing renders is deleted rather than kept.
 *
 * `body` looks like a synonym of `content` and is not, which is why it is here
 * rather than in `REFUSED`. `Steps` renders both: `content` is what the stage
 * holds while it is open, and `body` is the step's name and its description
 * together. That grouping is real and neither registered word fits it, so the
 * question is what to call a heading and its subtitle, not which of two words
 * to keep. Renaming it to `content` would have merged two different boxes.
 */
const UNRESOLVED = {
  body: "Steps: a step's name and description together, which is a summary rather than a body.",
}

const problems = []
const seen = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier)) {
    /* See the header: the sandbox's parts are not a published surface. */
    if (path.includes('/sandbox/')) {
      continue
    }
    const text = readFileSync(path, 'utf8')
    const code = withoutComments(text)
    for (const match of code.matchAll(/(?<!\[)part="([a-z0-9 -]+)"/g)) {
      for (const one of match[1].split(/\s+/)) {
        const line = text.slice(0, match.index).split('\n').length
        if (!seen.has(one)) {
          seen.set(one, `${path}:${line}`)
        }
        if (REFUSED[one]) {
          problems.push(
            `${path}:${line}: renders \`part="${one}"\`, and \`${REFUSED[one]}\` is the registered ` +
              `word for ${ROLES[REFUSED[one]]}. One spelling per role, or a consumer styling ` +
              'twenty components learns twenty vocabularies.',
          )
        }
      }
    }
  }
}

/* An entry nothing renders is a note about a fix that already happened. */
for (const [word, note] of Object.entries(UNRESOLVED)) {
  if (!seen.has(word)) {
    problems.push(
      `\`${word}\` is listed in UNRESOLVED and nothing renders it any more. Delete the entry: ${note}`,
    )
  }
}
if (problems.length > 0) {
  console.error(`Part names off the registered vocabulary (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const registered = Object.keys(ROLES).filter((word) => seen.has(word))
console.log(
  `vocabulary: ${registered.length} registered role words in use, ${Object.keys(REFUSED).length} ` +
    `refused, ${Object.keys(UNRESOLVED).length} unresolved`,
)
