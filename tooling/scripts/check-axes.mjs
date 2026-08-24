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
 * - A styled axis never appears on the headless tier, which has nothing to
 *   paint and no box to size. `tone` is the exception and a principled one: it
 *   says what a thing means, and meaning survives having no stylesheet.
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
  /* **These are the states of `ThemeIntent.separation`'s mechanisms, one to
     one, and the two word forms are the point rather than a collision.** The
     theme names what does the separating and a component names what the surface
     then is: `border` and `outlined`, `fill` and `filled`, `shadow` and
     `elevated`, `space` and `plain`. Written down here because `fill` had a
     third use, `Button.fill` for how wide a control is, which is now `width`,
     and the two that are left agree with each other. The one that remains is
     CSS's own `fill` property, which every chart writes for paint and which is
     not ours to rename. */
  separation: ['elevated', 'filled', 'outlined', 'plain'],
  /* `muted` and `subtle` are the neutral role's own quiet inks rather than an
     emphasis axis fused into this one, which was the reading until it was
     measured. Every *other* tone is already solved to the least extreme value
     that clears its target and so sits on the AA floor: headroom over 4.5 runs
     0.17 for `primary` down to zero for `success` and `warning`, against 2.70
     for `foreground`. A quieter danger has nowhere to go, so the cross product
     `headless.css` feared has one populated column and these two are values here. */
  tone: [
    'accent',
    'danger',
    'info',
    'muted',
    'neutral',
    'primary',
    'subtle',
    'success',
    'surface',
    'warning',
  ],
  /* Geometry rather than paint, and registered because it is cross-cutting:
     anything that lets a consumer say how much of its container it takes says
     it with this word and these three values. It was `fill` on `Button`, whose
     docstring had to open "Width and not weight" because `emphasis` on the same
     element is documented as "How filled it is drawn". `size` is not the word
     either, for the reason `Dialog` gives when it takes one: that rule's test is
     whether two of them sitting together could legitimately differ, and two
     buttons do. This is a width policy and not a scale, `standard` existing
     precisely to stop a row being ragged. */
  width: ['auto', 'full', 'standard'],
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
 *
 * **Empty, and both entries were cleared by deciding rather than by deferring.**
 * `helix-bar-chart.material` held `gradient`, which is a way of distributing a
 * fill rather than a thing a bar is made of: it is `wash` now, local to charts.
 * `helix-text.tone` held `muted` and `subtle`, which turned out to be tone
 * values after all once the headroom was measured.
 */
const PENDING = {}

/**
 * Components whose `width` is a length rather than a policy.
 *
 * **One axis, two value kinds, and the exception is named rather than assumed.**
 * `width` asks how much room a thing takes, and most answer with a policy:
 * `auto`, `standard`, `full`. A table column answers with a CSS grid track,
 * `16rem` or `minmax(0, 2fr)`, because the question there is not which of three
 * behaviours but exactly how wide. Same axis, and the value space a continuum,
 * so the registry cannot hold it and this says which components are on that
 * side of it. They are exempt from the value list and from the styled-tier rule,
 * a track being what the headless tier feeds `grid-template-columns`.
 *
 * What it does not excuse is a *policy* under another name. `fill`, `span` and
 * `block` are the ones to watch for, and `fill` is where this started.
 */
const LENGTHS = new Set(['table'])

const problems = []
const seenUnswept = new Set()
const seenPending = new Set()
const seenLengths = new Set()

/* Which visual axes each family declares, and which groups it is read beside.
   Collected across both tiers before anything is judged, because a group is
   only comparable once every member has been seen. */
const declaresAxis = new Map()
const inGroups = new Map()

for (const tier of ['headless', 'styled']) {
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
      for (const group of declaration.helix?.groups ?? []) {
        if (!inGroups.has(group)) {
          inGroups.set(group, new Set())
        }
        inGroups.get(group).add(family)
      }
      for (const attribute of declaration.attributes ?? []) {
        if (attribute.name in AXES) {
          if (!declaresAxis.has(family)) {
            declaresAxis.set(family, new Set())
          }
          declaresAxis.get(family).add(attribute.name)
        }
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
        if (name === 'width' && LENGTHS.has(family)) {
          seenLengths.add(family)
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

for (const family of LENGTHS) {
  if (!seenLengths.has(family)) {
    problems.push(
      `\`LENGTHS\` holds \`${family}\`, which no longer takes a \`width\`. Drop the entry.`,
    )
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

/**
 * A family declaring a visual axis that the families it is read beside do not.
 *
 * **Absence is not checkable and this is not absence.** Whether a component
 * *should* have an axis needs a reading of what it is for: a sparkline
 * plausibly takes `wash` and not `glass`, because at its size there is nothing
 * to see through. A check that guessed would file work that is wrong more often
 * than right. What a script can see is disagreement between families that owe
 * each other an answer, which is a different claim and a true one.
 *
 * **`@groups` rather than `category`, and the measurement is why.** The nine
 * chart-adjacent families span three categories, so a rule keyed on purpose
 * would never compare a meter against a bar chart, and `content` held 27
 * families, so it would compare a bar chart against a blockquote. Too coarse and
 * too narrow at once. A group says which families are read together.
 *
 * The sharpest case is the one that motivated it: `legend` renders a swatch, and
 * a key whose swatches are solid while the bars they key are outlined is a
 * legend that does not match its own chart. Nothing else here could see that.
 *
 * Reported rather than failed on, for the reason `check:routes` counts its
 * stubs: the answer to a disagreement is sometimes that the axis genuinely does
 * not apply, and failing would pressure someone into declaring an axis to
 * silence a script. A count that does not fall is visible work.
 */
const disagreements = []
for (const [group, families] of inGroups) {
  const declared = new Map()
  for (const family of families) {
    for (const axis of declaresAxis.get(family) ?? []) {
      declared.set(axis, (declared.get(axis) ?? 0) + 1)
    }
  }
  for (const [axis, count] of declared) {
    if (count === families.size) {
      continue
    }
    const missing = [...families].filter((family) => !declaresAxis.get(family)?.has(axis)).sort()
    disagreements.push(
      `${group}: ${count} of ${families.size} declare \`${axis}\`, and ${missing.join(', ')} do not`,
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

if (disagreements.length > 0) {
  console.log(`  ${disagreements.length} disagreements inside a group:`)
  for (const line of disagreements.sort()) {
    console.log(`    ${line}`)
  }
}

const swept = Object.keys(AXES).length
console.log(
  `axes: ${swept} in the registry, every declared value drawn from one of them` +
    (seenUnswept.size > 0
      ? `, ${seenUnswept.size} families still on \`appearance\` and named as such`
      : ', and `appearance` is gone'),
)
