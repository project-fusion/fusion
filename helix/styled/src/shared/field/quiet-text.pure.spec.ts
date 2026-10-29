import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { unweighted } from '@fusion.dev/helix-testing/sheets'

/**
 * Quiet text that is read is painted in `foreground-muted`.
 *
 * The theme engine solves `foreground-muted` against every ground in its surface
 * model and does not emit `foreground-subtle`, because the readable range holds one
 * quiet ink. So text in `foreground-subtle` has no contrast guarantee: measured
 * on October 10, 2026, it read as low as 2.26:1 on derived themes over pages of
 * #f7f2eb, #e8dcc4, #d9d9d9 and #bfb39a, where `foreground-muted` cleared 4.5:1
 * on each ground the engine models. `foreground-subtle` stays for marks that are
 * not text and for the text of a disabled control.
 *
 * Read from the sheets, because the token a rule names is the decision, and
 * a rule that slides back to the quieter ink is the regression this guards.
 */
const SRC = join(import.meta.dir, '..', '..')

/** Each sheet, the selector of the rule, and the property that carries the ink. */
const QUIET: [sheet: string, selector: string, property: string][] = [
  ['shared/field/field.css', '::placeholder', 'color'],
  ['shared/field/field.css', '[part="hint"]', 'color'],
  ['shared/field/field-segments.css', '[part~="segment-placeholder"]', 'color'],
  ['shared/collection/state.css', '[part="empty"]', 'color'],
  ['shared/tags/tags.css', '[part="rest"]', 'color'],
  ['canvas/node/canvas-node.css', '::slotted([slot="description"])', 'color'],
  ['canvas/root/canvas-root.css', '[part="label"]', 'color'],
  ['chat/root/chat-root.css', '[part="history"]', 'color'],
  ['code-block/root/code-block-root.css', '[part="gutter"]', 'color'],
  ['color-input/root/color-input-root.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['color-picker/root/color-picker-root.css', '[part="hint"]', 'color'],
  ['combobox/root/combobox-root.css', '[part="control"]::placeholder', 'color'],
  ['date-input/root/date-input-root.css', '[part="segments"]', '--_segment-placeholder-color'],
  ['date-input/root/date-input-root.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['date-picker/root/date-picker-root.css', '[part="weekday"]', 'color'],
  ['drilldown/item/drilldown-item.generated.css', 'slot[name="description"]', 'color'],
  ['filter-input/chip/filter-chip.css', '[part="dismiss"]', 'color'],
  ['filter-input/chip/filter-chip.css', '[part="operator"]', 'color'],
  ['filter-input/root/filter-input-root.css', '[part="clear"]', 'color'],
  ['filter-input/root/filter-input-root.css', '[part="field"]', 'color'],
  ['filter-input/root/filter-input-root.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['graph/root/graph-root.css', '[part~="legend-item-hidden"]', 'color'],
  ['graph/root/graph-root.css', '[part="search-field"]::placeholder', 'color'],
  ['graph/root/graph-root.css', '[part="settling"]', 'color'],
  ['image/root/image-root.generated.css', '[part="fallback"]', 'color'],
  ['input/root/input-root.generated.css', '[part="field"]', 'color'],
  ['input/root/input-root.generated.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['lightbox/item/lightbox-item.css', '[part="item"] ::slotted([slot="description"])', 'color'],
  ['log/group/log-group.css', '[part="status"]', 'color'],
  ['log/line/log-line.css', '[part~="line-debug"]', 'color'],
  ['log/root/log-root.css', ':host', '--log-ansi-bright-black'],
  ['map/root/map-root.css', '::slotted([slot="attribution"])', 'color'],
  ['menu/item/menu-item.generated.css', '[part="end"]', 'color'],
  ['menu/item/menu-item.generated.css', 'slot[name="description"]', 'color'],
  ['menu/section/menu-section.generated.css', '[part="heading"]', 'color'],
  ['notifications/group/notification-group.css', '[part="count"]', 'color'],
  ['notifications/notification/notification.css', '[part="dismiss"]', 'color'],
  ['log/line/log-line.css', '[part="count"]', 'color'],
  [
    'notifications/notification/notification.css',
    '[part="trailing"] > :not([part="controls"])',
    'color',
  ],
  ['notifications/notification/notification.css', 'slot[name="description"]::slotted(*)', 'color'],
  ['number-input/root/number-input-root.generated.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['option/group/option-group.css', '[part="label"]', 'color'],
  ['pagination/root/pagination-root.css', '[part="gap"]', 'color'],
  ['pagination/summary/pagination-summary.css', ':host', 'color'],
  ['pin-input/root/pin-input-root.generated.css', '[part="placeholder"]', 'color'],
  ['sandbox/source/sandbox-source.css', '[part="line"]::before', 'color'],
  ['sandbox/status-bar/sandbox-status-bar.css', ':host', 'color'],
  ['slider/root/slider-root.generated.css', '[part="marker-label"]', 'color'],
  ['steps/root/steps-root.generated.css', ':host([variant="numeric"])', '--_steps-marker-color'],
  ['steps/step/step.generated.css', '[part="description"]', 'color'],
  ['tabs/root/tabs-root.generated.css', '[part="scroll-start"]', 'color'],
  ['tabs/tab/tab.generated.css', '[part="tab"]', 'color'],
  ['textarea/root/textarea-root.generated.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['time-input/root/time-input-root.css', '[part="segments"]', '--_segment-placeholder-color'],
  ['time-input/root/time-input-root.css', 'slot[name="start"]::slotted(*)', 'color'],
  ['time-picker/root/time-picker-root.css', '[part="hint"]', 'color'],
  ['tree/root/tree-root.css', ':host([nesting="heading"])', '--_tree-heading-ink'],
  [
    'video-playlist/item/video-playlist-item.css',
    '[part="label"] ::slotted([slot="meta"])',
    'color',
  ],
  ['../../styles/src/base.css', '[data-megamenu-heading]', 'color'],
  ['../../styles/src/base.css', ':where([data-prose] th)', 'color'],
]

const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The value the first rule for `selector` gives `property`.
 *
 * **A rule for the selector alone is read before a list it opens.** The
 * pagination's gap shares a muted control box with the pages and sets its own
 * ink in a rule of its own, so the list would answer for the wrong rule.
 */
const declared = (sheet: string, selector: string, property: string): string | undefined => {
  const text = readFileSync(join(SRC, sheet), 'utf8')
  /* A generated sheet's conditions weigh nothing, and the selector reads as written. */
  const css = (sheet.endsWith('.generated.css') ? unweighted(text) : text).replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  for (const after of ['\\s*\\{', ',\\n']) {
    const opening = new RegExp(`(?:^|\\n)${literal(selector)}${after}`, 'g')
    for (const found of css.matchAll(opening)) {
      const body = css.slice(found.index, css.indexOf('}', found.index))
      const value = new RegExp(`(?:^|[\\s;{])${literal(property)}:\\s*([^;]+);`).exec(body)?.[1]
      if (value) {
        return value.trim()
      }
    }
  }
  return undefined
}

/**
 * The token a rule paints `property` in: the innermost `--helix-color-*` of its
 * value, which is what paints when the page sets none of the hooks in front of
 * it.
 */
const inkOf = (sheet: string, selector: string, property: string): string | undefined =>
  [...(declared(sheet, selector, property) ?? '').matchAll(/--helix-color-[a-z-]+/g)].at(-1)?.[0]

/** Every placeholder rule, which sets the weight a placeholder is drawn at. */
const PLACEHOLDERS: [sheet: string, selector: string][] = [
  ['shared/field/field.css', '::placeholder'],
  ['shared/field/field-segments.css', '[part~="segment-placeholder"]'],
  ['combobox/root/combobox-root.css', '[part="control"]::placeholder'],
  ['graph/root/graph-root.css', '[part="search-field"]::placeholder'],
  ['pin-input/root/pin-input-root.generated.css', '[part="placeholder"]'],
]

describe('quiet text', () => {
  for (const [sheet, selector, property] of QUIET) {
    test(`${sheet} ${selector} paints its ${property} in foreground-muted`, () => {
      expect(inkOf(sheet, selector, property)).toBe('--helix-color-foreground-muted')
    })
  }

  /* The muted ink can sit close to the value's on a tinted page, so the weight
     is what keeps a placeholder from reading as a typed value. */
  for (const [sheet, selector] of PLACEHOLDERS) {
    test(`${sheet} ${selector} is set in the regular weight`, () => {
      expect(declared(sheet, selector, 'font-weight')).toBe('var(--helix-weight-regular)')
    })
  }

  /* A step ahead sat one ink below a finished one, and the range holds one
     quiet ink, so the step between them is a weight. */
  test('a numeric step ahead is set lighter than a finished one', () => {
    const root = unweighted(readFileSync(join(SRC, 'steps/root/steps-root.generated.css'), 'utf8'))
    const step = unweighted(readFileSync(join(SRC, 'steps/step/step.generated.css'), 'utf8'))
    expect(root).toMatch(
      /:host\(\[marker="numeric"\]\) \{[^}]*--_steps-marker-weight: var\(--helix-weight-regular\);/,
    )
    expect(step).toMatch(
      /\[part="marker"\] \{[^}]*font-weight: var\(--_steps-marker-weight, var\(--helix-weight-semibold\)\);/,
    )
    for (const state of ['complete', 'current']) {
      expect(step).toMatch(
        new RegExp(
          `:host\\(\\[${state}\\]\\) \\[part="marker"\\] \\{[^}]*font-weight: var\\(--helix-weight-semibold\\);`,
        ),
      )
    }
  })
})
