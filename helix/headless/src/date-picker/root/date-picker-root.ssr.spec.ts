import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-date-picker'

const calendar = html`<helix-headless-date-picker
  label="Choose a date"
  default-month="2026-08"
  value="2026-08-14"
></helix-headless-date-picker>`

describe('calendar server output', () => {
  test('the month is rendered on the server, not built on the client', () => {
    // `rendered` rather than the whole document: the heading is what this drew,
    // and the host tag beside it is the consumer's own markup.
    expect(rendered(ssr(calendar), TAG)).toContain('August 2026')
    expect(partTag(ssr(calendar), 'grid')).toContain('role="grid"')
  })

  /** The one cell the served grid puts its tab stop on, opening tag and all. */
  const anchor = (markup: string): string =>
    /<span[^>]*part="cell"[^>]*tabindex="0"[^>]*>/.exec(rendered(markup, TAG))?.[0] ?? ''

  test('the chosen date is marked in the served grid', () => {
    /* The question this cohort settled, asked of a grid rather than a field: a
       calendar whose selection arrives on hydration serves forty-two days with
       nothing to say which one is the answer. The mark is asserted through the
       part as well as through the state, since a stylesheet outside cannot
       follow `::part()` with an attribute and reads the part name instead. */
    const markup = ssr(calendar)
    expect(anchor(markup)).toContain('aria-label="Friday, August 14, 2026"')
    expect(anchor(markup)).toContain('aria-selected="true"')
    expect(servedParts(markup)).toContain('day-selected')
  })

  test('the tab stop is on the chosen day, and there is exactly one of it', () => {
    // One stop for the whole grid, per the APG date grid, and it is in the
    // served markup, so a keyboard reader can reach it before any script runs.
    expect([...rendered(ssr(calendar), TAG).matchAll(/tabindex="0"/g)]).toHaveLength(1)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(calendar), 'helix-headless-date-picker')).toEqual([
      'default-month',
      'label',
      'value',
    ])
  })

  test('both month controls are named, their content being a caret apiece', () => {
    /* Two glyph-only buttons either side of a heading. Unnamed a reader hears
       "button", "August 2026", "button" and has to guess which way each goes.

       Words the component does not default to, `previousLabel` holding
       "Previous month" and `nextLabel` "Next month": read against those, the
       assertion is satisfied by a template writing the literals. */
    const named = ssr(
      html`<helix-headless-date-picker
        default-month="2026-08"
        next-label="A month on"
        previous-label="A month back"
      ></helix-headless-date-picker>`,
    )
    expect(partTag(named, 'previous')).toContain('aria-label="A month back"')
    expect(partTag(named, 'next')).toContain('aria-label="A month on"')
  })
})

describe('calendar as a form control, on the server', () => {
  test('the host carries only what the consumer wrote, form control or not', () => {
    /* Becoming form-associated adds `disabled` from `HelixFormElement`, which
       reflects. A boolean that reflects only when set writes nothing when it is
       not, which is what keeps the served host equal to the markup. */
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-date-picker label="When" name="when" value="2026-08-14"></helix-headless-date-picker>`,
        ),
        'helix-headless-date-picker',
      ),
    ).toEqual(['label', 'name', 'value'])
  })

  test('the grid still serves, which becoming a form control must not change', () => {
    expect(
      hasPart(
        ssr(
          html`<helix-headless-date-picker default-month="2026-08"></helix-headless-date-picker>`,
        ),
        'grid',
      ),
    ).toBe(true)
  })
})
