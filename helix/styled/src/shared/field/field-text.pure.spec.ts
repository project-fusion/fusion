import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Text you type is at least 16px on a touch screen.
 *
 * iOS Safari zooms the page into a focused input, textarea or select whose
 * text is under 16px, and every field drew its text at 12 to 14px, so focusing
 * one on a phone zoomed the page and left it zoomed. `--helix-text-field-min`
 * is 16px under a coarse pointer and 0 elsewhere, and each element a reader
 * types into sets its type to the larger of that and its own step, which
 * leaves the desktop sizes as they were. Measured in Chromium with touch
 * emulation: every field below computes 16px, and 12 to 14px without it.
 *
 * Read from the sheets, because the pointer is a media query a spec in a page
 * cannot switch, and a family that sets its own size without the floor is the
 * regression this guards.
 */
const SRC = join(import.meta.dir, '..', '..')

/** Each sheet, and the selector of the rule that sets the editable text's size. */
const FIELDS: [sheet: string, selector: string][] = [
  ['shared/field/field-frame.css', '[part="control"] {'],
  ['shared/field/field-segments.css', '[part="segments"] {'],
  ['select/root/select-root.generated.css', ':host [part="trigger"] {'],
  ['listbox/root/listbox-root.generated.css', ':host [part="search-field"] {'],
  ['command/root/command-root.css', 'helix-listbox::part(search-field) {'],
  ['color-picker/root/color-picker-root.generated.css', ':host [part="value"] {'],
  ['color-picker/root/color-picker-root.generated.css', ':host [part="field-input"] {'],
  ['chat/composer/chat-composer.generated.css', ':host [part="field"] {'],
  ['object-inspector/root/object-inspector-root.generated.css', ':host [part="search-field"] {'],
  ['graph/root/graph-root.css', '[part="search-field"] {'],
  ['canvas/root/canvas-root.css', '[part="label-editor"] {'],
  ['sandbox/source/sandbox-source.css', '[part="source"] {'],
  ['sandbox/console/sandbox-console.css', '[part="filter"] {'],
]

/** The `font-size` the first rule opening with `selector` declares. */
const fontSize = (sheet: string, selector: string): string | undefined => {
  const css = readFileSync(join(SRC, sheet), 'utf8')
  const start = css.indexOf(`\n${selector}`)
  const body = start < 0 ? '' : css.slice(start, css.indexOf('}', start))
  return /font-size:\s*([^;]+);/.exec(body)?.[1]
}

describe('a field on a touch screen', () => {
  for (const [sheet, selector] of FIELDS) {
    test(`${sheet} ${selector.slice(0, -2)} has the floor under its text`, () => {
      expect(fontSize(sheet, selector)).toMatch(
        /^max\(var\(--helix-text-field-min\), var\(--helix-text-[a-z]+\)\)$/,
      )
    })
  }

  test('the floor is 16px under a coarse pointer and 0 otherwise', () => {
    const modes = readFileSync(join(SRC, '..', '..', 'styles', 'src', '_modes.css'), 'utf8')
    expect(modes).toMatch(
      /:root \{\s*--_helix-size-target: 1\.5rem;\s*--_helix-text-field-min: 0px;/,
    )
    expect(modes).toMatch(
      /@media \(pointer: coarse\) \{\s*:root \{\s*--_helix-size-target: 2\.75rem;\s*--_helix-text-field-min: 16px;/,
    )
  })
})
