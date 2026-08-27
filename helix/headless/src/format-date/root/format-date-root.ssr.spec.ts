import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A timestamp, served.
 *
 * The reading is computed against the server's clock, which is a different clock
 * from the reader's and can be a long way from it. `datetime` carries the exact
 * instant either way, so a reading that is briefly wrong is a text node
 * hydration replaces rather than a fact the markup gets wrong.
 */

const at = '2020-01-01T00:00:00.000Z'

describe('format-date server output', () => {
  test('the exact instant is in `datetime`, whatever clock computed the reading', () => {
    const markup = ssr(html`<helix-headless-format-date date=${at}></helix-headless-format-date>`)
    expect(partTag(markup, 'time')).toContain(`datetime="${at}"`)
  })

  test('the options a consumer set are the ones the server formatted with', () => {
    const markup = ssr(
      html`<helix-headless-format-date
        date=${at}
        day="numeric"
        locale="en-US"
        month="short"
        year="numeric"
      ></helix-headless-format-date>`,
    )
    expect(withoutStyles(markup)).toContain('Jan 1, 2020')
  })

  /**
   * The consequence of the light-DOM spelling, asserted rather than left to be
   * discovered.
   *
   * `<helix-format-date elapsed>2020-01-01…</helix-format-date>` is the nicest
   * way to write one and it cannot reach a server: measured against Lit's own
   * shim, `textContent`, `children`, `firstChild` and `querySelector` are all
   * `undefined` there. So the element renders nothing rather than guessing, and
   * fills in on the client. Anything that has to be right in the served HTML
   * carries the attribute.
   */
  test('a value written as text and not as an attribute is not served', () => {
    const markup = ssr(html`<helix-headless-format-date>${at}</helix-headless-format-date>`)
    expect(partTag(markup, 'time')).toBe('')
  })

  test('the host writes no attributes of its own', () => {
    const markup = ssr(html`<helix-headless-format-date date=${at}></helix-headless-format-date>`)
    expect(hostAttributes(markup, 'helix-headless-format-date')).toEqual(['date'])
  })
})
