import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const calendar = html`<helix-calendar
  label="Choose a date"
  month="2026-08"
  value="2026-08-14"
></helix-calendar>`

describe('calendar server output', () => {
  test('the month is rendered on the server, not built on the client', () => {
    const markup = withoutStyles(ssr(calendar))
    expect(markup).toContain('August 2026')
    expect(partTag(ssr(calendar), 'grid')).toContain('role="grid"')
  })

  test('the tab stop is in the served markup, so the grid is reachable at once', () => {
    expect(withoutStyles(ssr(calendar))).toContain('tabindex="0"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(calendar), 'helix-calendar')).toEqual(['label', 'month', 'value'])
  })
})

describe('calendar as a form control, on the server', () => {
  test('the host carries only what the consumer wrote, form control or not', () => {
    /* Becoming form-associated adds `disabled` from `HelixFormElement`, which
       reflects. A boolean that reflects only when set writes nothing when it is
       not, which is what keeps the served host equal to the markup. */
    expect(
      hostAttributes(
        ssr(html`<helix-calendar label="When" name="when" value="2026-08-14"></helix-calendar>`),
        'helix-calendar',
      ),
    ).toEqual(['label', 'name', 'value'])
  })

  test('the grid still serves, which becoming a form control must not change', () => {
    expect(hasPart(ssr(html`<helix-calendar month="2026-08"></helix-calendar>`), 'grid')).toBe(true)
  })
})
