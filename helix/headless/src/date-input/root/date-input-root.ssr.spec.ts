import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('date input server output', () => {
  test('the field carries its own autofill token, on the control that is read', () => {
    /* The control is a text input, so autofill offers it whatever it likes
       unless the consumer names a token, and the token is read off the parsed
       markup rather than after the element upgrades. */
    expect(
      partTag(
        ssr(
          html`<helix-headless-date-input label="Born" autocomplete="bday"></helix-headless-date-input>`,
        ),
        'control',
      ),
    ).toContain('autocomplete="bday"')
  })

  test('the calendar trigger is named, its content being a glyph', () => {
    // A word the component does not default to, since `triggerLabel` holds
    // "Choose a date" and asserting that would pass against a literal.
    expect(
      partTag(
        ssr(
          html`<helix-headless-date-input
            label="Born"
            trigger-label="Pick from a calendar"
          ></helix-headless-date-input>`,
        ),
        'trigger',
      ),
    ).toContain('aria-label="Pick from a calendar"')
  })

  test('the granularity reaches the calendar, which is the element that uses it', () => {
    /* `step` is not read by this component at all: it is handed to the picker
       inside, where it decides which dates are selectable. The picker is a
       different element, so a binding that stopped forwarding leaves a calendar
       at its own default with the property here still reading what was set. */
    const markup = ssr(
      html`<helix-headless-date-input label="Week" step="7" default-open></helix-headless-date-input>`,
    )
    expect(partTag(markup, 'picker')).toContain('step="7"')
  })

  test('`default-open` serves the surface showing and the trigger saying so', () => {
    const open = ssr(
      html`<helix-headless-date-input label="Born" default-open></helix-headless-date-input>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')

    const shut = ssr(html`<helix-headless-date-input label="Born"></helix-headless-date-input>`)
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
    expect(partTag(shut, 'trigger')).toContain('aria-expanded="false"')
  })

  test('`segmented` serves a segment for each part of the date, holding the value', () => {
    const markup = ssr(
      html`<helix-headless-date-input
        label="Born"
        segmented
        locale="en-US"
        value="2026-08-04"
      ></helix-headless-date-input>`,
    )
    const shadow = rendered(markup, 'helix-headless-date-input')
    expect(partTag(markup, 'segments')).toContain('role="group"')
    expect(partTag(markup, 'segments')).toContain('aria-labelledby="label"')
    expect(shadow).toContain('aria-valuetext="8 – August"')
    expect(shadow).toContain('aria-valuenow="2026"')
    expect(partTag(markup, 'control')).toBe('')
  })
})
