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

const TAG = 'helix-time-input'

const field = html`<helix-time-input
  hint="Any quarter hour"
  label="Starts"
  locale="en-GB"
  name="starts"
  value="09:15"
></helix-time-input>`

describe('input time server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(ssr(field), 'field')).toBe(true)
    expect(hasPart(ssr(field), 'control')).toBe(true)
    expect(hasPart(ssr(field), 'trigger')).toBe(true)
  })

  test('the time is written the reader’s way on the server, not a frame later', () => {
    /* `Intl` runs on the server, so the rendering is server work rather than a
       correction made after the page arrives. Asked of the input: this field
       shows `09:15` as `09:15` in `en-GB` and as `9:15 AM` elsewhere, so a
       `toContain('09:15')` against the whole document was passing on the
       consumer's own `value="09:15"` on the host and would have gone on passing
       had the rendering never happened at all. */
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('name="starts"')
    expect(tag).toContain('value="09:15"')
    expect(
      partTag(
        ssr(
          html`<helix-time-input label="Starts" locale="en-US" value="09:15"></helix-time-input>`,
        ),
        'control',
      ),
    ).toContain('value="9:15 AM"')
  })

  test('the label is served and names the field', () => {
    expect(namesControl(ssr(field))).toBe(true)
    expect(rendered(ssr(field), TAG)).toContain('Starts')
  })

  test('disabled, required and read-only are on the served control', () => {
    const tag = partTag(
      ssr(html`<helix-time-input disabled label="Starts" readonly required></helix-time-input>`),
      'control',
    )
    expect(tag).toContain('disabled')
    expect(tag).toContain('required')
    expect(tag).toContain('readonly')
  })

  test('the list is served closed, and says so', () => {
    expect(partTag(ssr(field), 'surface')).toContain('hidden')
    expect(partTag(ssr(field), 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker ships inside it, rather than being built on hydration', () => {
    expect(partTag(ssr(field), 'picker')).toContain('helix-time-picker')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(field), TAG)).toEqual(['hint', 'label', 'locale', 'name', 'value'])
  })

  test('`segmented` ships its segments on the clock asked for, before any script runs', () => {
    const markup = ssr(
      html`<helix-time-input hour-cycle="h23" label="Starts" locale="en-US" segmented value="14:30"></helix-time-input>`,
    )
    const shadow = rendered(markup, TAG)
    expect(hasPart(markup, 'segments')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(false)
    const order = [...shadow.matchAll(/data-segment="([a-z]+)"/gi)].map((match) => match[1])
    expect(order).toEqual(['hour', 'minute'])
    expect(shadow).toContain('aria-valuenow="14"')
  })
})
