#!/usr/bin/env node
/**
 * Holds every component to one registry of visual axes.
 *
 * **The library had four axes and one word for all of them.** Counted across
 * both tiers, `appearance` held 21 declarations describing at least four
 * different questions: where a surface ends (`card` outlined/elevated/plain),
 * how much ink a control claims (`ghost`/`solid`/`subtle`), which widget gets
 * rendered (`tabs` segmented/underlined, `time-picker` list/wheels), and in one
 * case a plain misfiled tone (`badge` danger/neutral). The tell is that
 * `outlined` appears in two of those groups meaning different things: on a Card
 * it says where the surface ends, on a Button it says how much ink.
 *
 * **A registry is the deliverable and the renames are the consequence.** The
 * words drifted because nothing held them, not because anybody chose badly:
 * `tone` is already five incompatible value sets plus `severity` as a sixth
 * spelling of it, which is the same disease one stage earlier. Without a check,
 * this converges back to one word inside a year, which is what happened the
 * first time.
 *
 * **The library found this itself and could not act on it.** `megamenu-root.css`
 * reads: "a consumer can make the panel glass, which is not an appearance:
 * `full` already occupies that axis with a layout ... Two things that can be
 * true at once are two axes". It derived the test, had nowhere to put the
 * answer, and fell back to an unnamed custom property.
 *
 * Three rules, and the third is what makes it a sweep rather than a rename:
 *
 * - A property named after an axis draws only from that axis. A component may
 *   take a subset, because most surfaces have meaning for two of the four, and
 *   may never invent a value.
 * - A visual axis never appears on the headless tier, which has nothing to
 *   paint. `tone` is the exception and a principled one: it says what a thing
 *   means, and meaning survives having no stylesheet.
 * - `variant` is the escape hatch and takes no registry, being component-
 *   specific by definition: `segmented` against `underlined`, `list` against
 *   `wheels`, `dots` against `marks`. It lives on either tier, because a choice
 *   between two widgets is structural wherever it is made. What it may not be
 *   is a place to put something that *is* on an axis, which is the failure mode
 *   `appearance` demonstrated for 21 components.
 * - `appearance` is refused outright. It is not a word this library uses: it
 *   held 21 declarations across four axes, and `UNSWEPT` is empty now, so a
 *   component reintroducing it fails rather than being asked to explain itself.
 *
 * Run with `bun run check:axes`, after `bun run analyze`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The vocabulary. A component takes a subset; nobody invents a value. */
const AXES = {
  emphasis: ['ghost', 'outlined', 'solid', 'subtle'],
  /* `transparent` is on this axis rather than beside it: opaque, glass and
     transparent are three points of one optical language, and `app-header`
     proves it from the inside by emitting the same two declarations for its
     transparent bar once anything has scrolled under it. `matte` is not here.
     It was in the first sketch of this registry and nothing needs it, which is
     the same test `UNSWEPT` applies to itself. */
  material: ['frosted', 'glass', 'transparent'],
  separation: ['elevated', 'filled', 'outlined', 'plain'],
  tone: ['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'surface', 'warning'],
}

/**
 * Families whose `appearance` has not been reclassified yet, each with what it
 * turns out to be.
 *
 * **Empty, and the check below is what keeps it that way.** It held 21
 * declarations when this was written and now holds none: `appearance` is not a
 * word this library uses, so any component reintroducing it fails outright
 * rather than being asked to explain itself. The entries are in the history of
 * this file if the reasoning is ever wanted; each named the axis its family
 * turned out to be on, and two of them were wrong because they were read from
 * value names rather than from what the values did.
 */
const UNSWEPT = {}

/**
 * Values off the registry that another row already owns, so this check names the
 * work rather than blocking on it. Same contract as `UNSWEPT`: an entry nothing
 * needs is refused below.
 */
const PENDING = {
  'helix-bar-chart.material': '#156, the wash is a chart-domain axis and not a material',
  /* Blocked on the palette rather than on the rename: there is a quiet step for
     the neutral ink and none for any other tone, so a muted danger has nothing
     to be made of and three of the four combinations would be unsayable. */
  'helix-text.tone': '#141, `muted` and `subtle` want a quiet step per tone first',
}

const problems = []
const seenUnswept = new Set()
const seenPending = new Set()

for (const tier of ['headless', 'web']) {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, `helix/${tier}/custom-elements.json`), 'utf8'),
  )
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      const tag = declaration.tagName
      if (!tag) {
        continue
      }
      const family = module.path.split('/')[1]
      for (const attribute of declaration.attributes ?? []) {
        const name = attribute.name
        if (name === 'appearance') {
          seenUnswept.add(family)
          if (!(family in UNSWEPT)) {
            problems.push(
              `${tag} declares \`appearance\`, which is not a word this library uses. ` +
                'It held four axes at once and was retired by #158: `separation` is ' +
                'where a surface ends, `emphasis` is how much ink a control claims, ' +
                '`material` is what it is made of, `tone` is what it means, and a ' +
                'component-specific choice that is none of those is `variant`.',
            )
          }
          continue
        }
        const axis = AXES[name]
        if (!axis) {
          continue
        }
        /* `tone` is the one axis both tiers may carry, and the exception is
         principled rather than a concession: it says what a thing *means*, and
         meaning survives having no stylesheet. The other three say how it is
         painted, so on a tier with nothing to paint they are a promise nobody
         keeps. */
        if (tier === 'headless' && name !== 'tone') {
          problems.push(
            `${tag} declares \`${name}\` on the headless tier, which has no styling to ` +
              'vary. A visual axis belongs to `web`; a structural choice is `variant`.',
          )
          continue
        }
        const values = [...(attribute.type?.text ?? '').matchAll(/'([^']+)'/g)].map(
          (found) => found[1],
        )
        const invented = values.filter((value) => !axis.includes(value))
        if (invented.length > 0 && `${tag}.${name}` in PENDING) {
          seenPending.add(`${tag}.${name}`)
          continue
        }
        if (invented.length > 0) {
          problems.push(
            `${tag} gives \`${name}\` the value${invented.length > 1 ? 's' : ''} ` +
              `${invented.map((value) => `\`${value}\``).join(', ')}, which the axis does ` +
              `not have. \`${name}\` is ${axis.map((value) => `\`${value}\``).join(', ')}: ` +
              'take a subset of it, or the value belongs to a different axis.',
          )
        }
      }
    }
  }
}

for (const key of Object.keys(PENDING)) {
  if (!seenPending.has(key)) {
    problems.push(`\`PENDING\` holds \`${key}\`, which is on the registry now. Drop the entry.`)
  }
}

for (const family of Object.keys(UNSWEPT)) {
  if (!seenUnswept.has(family)) {
    problems.push(
      `\`UNSWEPT\` holds \`${family}\`, which no longer declares \`appearance\`. Drop ` +
        'the entry: an exemption nothing needs is a line the next reader has to check.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Axes off the registry (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const swept = Object.keys(AXES).length
console.log(
  `axes: ${swept} in the registry, every declared value drawn from one of them` +
    (seenUnswept.size > 0
      ? `, ${seenUnswept.size} families still on \`appearance\` and named as such`
      : ', and `appearance` is gone'),
)
