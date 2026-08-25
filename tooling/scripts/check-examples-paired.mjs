#!/usr/bin/env node
/**
 * Both tiers show the same example, and neither is generated from the other.
 *
 * **A headless example is how anyone finds out whether that tier works.** It is
 * the only place the claim is tested: `headless` is advertised as independently
 * consumable, and the way to know is to take it, write every rule by hand, and
 * look. Doing that once across eighty families turned up an accordion that never
 * collapsed, twenty-one glyphs nobody outside the component could reach, a chart
 * palette no consumer could set, and a token the headless tier named and could
 * not resolve. None of those was visible from the styled tier, which is exactly
 * the point, and all of it is why the examples exist at all. That paragraph is
 * inherited from `build-headless-examples.mjs`, which this replaces: the
 * findings outlive the mechanism that found them.
 *
 * **What that generator got backwards was the direction.** `@helix-io/styled`
 * depends on `@helix-io/headless`, so headless is the base and styled builds on
 * it. The generator derived each headless example from the styled one beside it,
 * which made the base tier's examples a function of the tier above it and left
 * `helix/headless` with no examples of its own at all. The defense was that
 * styled is headless plus invented presentation, so only the lossy direction is
 * mechanical. That is true and it is an argument for deriving neither: styled
 * inventing presentation is the whole purpose of the tier, not an obstacle to
 * be worked around.
 *
 * So both are authored, in their own package, under the same name, and this
 * holds them to each other instead. The directory carries the tier and the file
 * name carries the variant, which is what lets the pairing be a same-name
 * comparison rather than a special case.
 *
 * **What is asserted is the copy, not the markup.** The tiers differ by
 * construction: different tags, different attributes, `helix-text` becoming
 * whatever its `as` names, `helix-flex` becoming a plain box because layout
 * components have no headless twin. What must not differ is what a reader sees,
 * because the tabs show one list and a reader switching tiers is meant to be
 * looking at the same example rather than at two different ones.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const STYLED = join(ROOT, 'helix/styled/src')
const HEADLESS = join(ROOT, 'helix/headless/src')

/** The example every family has on both tiers. */
const CANONICAL = 'preview.html'

/**
 * What a reader sees, with everything that is allowed to differ removed.
 *
 * Tags and attributes go, since the tiers exist to render the same thing
 * differently. Comments go. Whitespace collapses, because one tier's markup
 * nests deeper than the other's and indentation is not copy.
 *
 * **And `<style>` goes, contents and all**, which the first version of this
 * missed: it stripped tags and compared what was between them, so `virtual-list`
 * failed on `var(--helix-space-sm)` against `0.5rem`. A headless stylesheet
 * writing raw values is not a difference in copy, it is the tier working as
 * documented, and `check:tokens` permits it by name.
 */
const copy = (markup) =>
  markup
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const families = readdirSync(STYLED, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(STYLED, name, '.examples', CANONICAL)))
  /* **A family with no headless tier has nothing to pair with.** `aura`, `flex`,
     `grid`, `sandbox` and `text` are layout and tooling, and the tier does not
     implement them: there is no directory for them under `helix/headless/src`
     at all. Their absence is the answer rather than a gap, and the package
     directory is the signal, not a list kept here. */
  .filter((name) => existsSync(join(HEADLESS, name)))

const findings = []
let compared = 0

for (const family of families) {
  const twin = join(HEADLESS, family, '.examples', CANONICAL)
  if (!existsSync(twin)) {
    /* Reported rather than skipped. A family with a styled example and no
       headless one is the tier going unexercised, which is the case these
       examples exist to catch and the one a missing file hides. */
    findings.push(`${family}: styled has ${CANONICAL} and headless does not`)
    continue
  }

  const styled = copy(readFileSync(join(STYLED, family, '.examples', CANONICAL), 'utf8'))
  const headless = copy(readFileSync(twin, 'utf8'))
  compared += 1

  if (styled !== headless) {
    findings.push(
      `${family}: the two tiers do not read the same.\n` +
        `      styled: ${styled.slice(0, 90)}\n` +
        `    headless: ${headless.slice(0, 90)}`,
    )
  }
}

/* The other direction, because a headless example whose styled twin was deleted
   is a page nothing renders and no list shows. */
for (const family of readdirSync(HEADLESS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)) {
  if (
    existsSync(join(HEADLESS, family, '.examples', CANONICAL)) &&
    !existsSync(join(STYLED, family, '.examples', CANONICAL))
  ) {
    findings.push(`${family}: headless has ${CANONICAL} and styled does not`)
  }
}

if (findings.length > 0) {
  console.error(
    `paired examples: ${findings.length} of ${families.length} families disagree.\n  ` +
      `${findings.join('\n  ')}\n\n` +
      '  Both tiers are authored now, neither generated from the other, so a\n' +
      '  difference here is a real edit to one and not the other.',
  )
  process.exit(1)
}

console.log(
  `paired examples: ${compared} families show the same copy on both tiers, ` +
    'each authored in its own package',
)
