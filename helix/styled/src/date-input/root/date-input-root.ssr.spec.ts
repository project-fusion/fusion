import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  namesControl,
  partTag,
  rendered,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-date-input'

const field = html`<helix-date-input
  hint="Any weekday"
  label="Starts"
  locale="en-US"
  min="2026-01-01"
  name="starts"
  value="2026-08-18"
></helix-date-input>`

describe('input date server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(ssr(field), 'field')).toBe(true)
    expect(hasPart(ssr(field), 'control')).toBe(true)
    expect(hasPart(ssr(field), 'trigger')).toBe(true)
  })

  test('the date is written out on the server, in the reader’s own words', () => {
    /* The field holds a rendering while nobody is in it, which is the whole of
       `dateStyle`, so what ships is `August 18, 2026` and not the value.

       Asked of the input rather than of the document, which is what this test
       used to do: the consumer wrote `value="2026-08-18"` on the host, so
       `toContain('2026-08-18')` passed on their own attribute and said nothing
       whatever about the field. It passed while the field rendered something
       else entirely, which is the fault it was written to catch. */
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('name="starts"')
    expect(tag).toContain('value="August 18, 2026"')
  })

  test('and holds the value itself where the consumer asked for ISO', () => {
    const iso = html`<helix-date-input
      date-style="iso"
      label="Starts"
      value="2026-08-18"
    ></helix-date-input>`
    expect(partTag(ssr(iso), 'control')).toContain('value="2026-08-18"')
  })

  test('the label is served and names the field', () => {
    expect(namesControl(ssr(field))).toBe(true)
    expect(rendered(ssr(field), TAG)).toContain('Starts')
  })

  test('disabled, required and read-only are on the served control', () => {
    const tag = partTag(
      ssr(html`<helix-date-input disabled label="Starts" readonly required></helix-date-input>`),
      'control',
    )
    expect(tag).toContain('disabled')
    expect(tag).toContain('required')
    expect(tag).toContain('readonly')
  })

  test('the calendar is served closed, and says so', () => {
    // `popover` and `hidden` are on the panel, so nothing flashes open while the
    // element is still upgrading.
    expect(partTag(ssr(field), 'surface')).toContain('hidden')
    expect(partTag(ssr(field), 'trigger')).toContain('aria-expanded="false"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(field), TAG)).toEqual([
      'hint',
      'label',
      'locale',
      'min',
      'name',
      'value',
    ])
  })
})
