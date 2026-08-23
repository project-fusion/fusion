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
 * - A visual axis never appears on the headless tier. That tier gets `variant`,
 *   and the split is already true in the code rather than aspirational: every
 *   `appearance` in `headless` is structural, without exception.
 * - A family still carrying `appearance` must be named in `UNSWEPT` with what
 *   it turns out to be. A family carrying it and unlisted fails, so the drawer
 *   cannot refill while #158 is in progress, and an entry for a family that no
 *   longer carries one fails too: an exemption nothing needs is a lie the next
 *   reader has to check.
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
 * turns out to be. Emptied, the last line of this check becomes unreachable and
 * `appearance` is refused outright.
 */
const UNSWEPT = {
  badge: 'tone, misfiled: danger and neutral are meanings, not treatments',
  /* Three families, one declaration: they take it from `MixinControlSurface`,
     whose own docstring already calls it "How filled it is drawn" and sits it
     beside `tone`, "What it means". The axis was named correctly and filed
     under the wrong word. */
  button: 'emphasis: the control surface',
  'button-group': 'variant: joined and spaced are a layout',
  checkbox: 'variant: `card` gives the option a description and a price, not a border',
  'color-input': 'variant: a swatch is a different control',
  'copy-button': 'emphasis: the control surface',
  'icon-button': 'emphasis: the control surface',
  loader: 'variant: pulse is which animation, not which surface',
  megamenu: 'variant: `full` is a layout, which is why glass had to be a hook',
  radio: 'variant: as checkbox, plus `chip` as a third layout',
  rating: 'variant: dots and marks are which glyph',
  splitter: 'variant: grip and line are which handle',
  steps: 'variant: numeric is which marker',
  tabs: 'variant: segmented and underlined are two different widgets',
  tag: 'emphasis: outlined, solid and subtle are ink, the same as a button',
  text: 'a type ramp, which is its own axis and not one of these',
  'time-input': 'variant: list and wheels are two different controls',
  'time-picker': 'variant: as time-input',
  toggle: 'emphasis: filled and plain are ink, on the group rather than the item',
  video: 'emphasis: plain and solid are ink',
}

/**
 * Values off the registry that another row already owns, so this check names the
 * work rather than blocking on it. Same contract as `UNSWEPT`: an entry nothing
 * needs is refused below.
 */
const PENDING = {
  'helix-bar-chart.material': '#156, the wash is a chart-domain axis and not a material',
  'helix-text.tone': '#158, `muted` and `subtle` are weight where the rest are meaning',
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
              `${tag} declares \`appearance\`, which is the word four axes shared and ` +
                'which #158 is retiring. Name the axis it is, or record the family in ' +
                '`UNSWEPT` with what it turns out to be.',
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
      : ''),
)
