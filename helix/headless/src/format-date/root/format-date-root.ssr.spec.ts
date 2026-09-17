import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-format-date'

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
  /**
   * A relative reading asks the page's ticker to wake it when it goes stale,
   * and a server has no page. Measured: a subscription there held the element
   * for up to an hour after its markup was sent, and the process that rendered
   * the notifications examples would not exit.
   */
  test('a relative reading starts no timer on the server', () => {
    const real = globalThis.setTimeout
    const started: number[] = []
    globalThis.setTimeout = ((run: () => void, wait?: number) => {
      started.push(wait ?? 0)
      return real(run, wait)
    }) as typeof setTimeout
    try {
      const recent = new Date(Date.now() - 5 * 60_000).toISOString()
      ssr(html`<helix-headless-format-date date=${recent} elapsed></helix-headless-format-date>`)
    } finally {
      globalThis.setTimeout = real
    }
    expect(started).toEqual([])
  })

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
    // `rendered` rather than the whole document: the reading is what this drew,
    // and the host tag beside it is the consumer's own markup.
    expect(rendered(markup, TAG)).toContain('Jan 1, 2020')
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
