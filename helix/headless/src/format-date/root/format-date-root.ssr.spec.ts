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

  test('the two options a time of day adds reach the formatter as well', () => {
    /* Every option here is handed to `Intl.DateTimeFormat` and read nowhere
       else, so the only way to tell one that is wired from one that is not is
       to look at the words that come out. `second` and `timeZoneName` are the
       pair a date alone never shows, which is why they are the ones nothing
       else in this file would exercise.

       `UTC` for the zone, so the reading does not move with the machine the
       suite runs on. */
    const markup = ssr(
      html`<helix-headless-format-date
        date=${at}
        hour="numeric"
        locale="en-US"
        minute="2-digit"
        second="2-digit"
        time-zone="UTC"
        time-zone-name="short"
      ></helix-headless-format-date>`,
    )
    expect(rendered(markup, TAG)).toContain('12:00:00 AM UTC')
  })

  test('and a reading nobody asked those of carries neither', () => {
    /* Both are absent by default, and `Intl` writes nothing for an option it
       was not given. A default written through would put seconds on every
       timestamp in the library. */
    const markup = ssr(
      html`<helix-headless-format-date
        date=${at}
        hour="numeric"
        locale="en-US"
        minute="2-digit"
        time-zone="UTC"
      ></helix-headless-format-date>`,
    )
    expect(rendered(markup, TAG)).toContain('12:00 AM')
    expect(rendered(markup, TAG)).not.toContain('UTC')
  })

  /**
   * The consequence of the light-DOM spelling, asserted rather than left to be
   * discovered.
   *
   * `<helix-headless-format-date
   * elapsed>2020-01-01…</helix-headless-format-date>` is the nicest way to
   * write one and it cannot reach a server: measured against Lit's own shim,
   * `textContent`, `children`, `firstChild` and `querySelector` are all
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

describe('format-date options a reader can see on the server', () => {
  /* Shoelace's format-date and relative-time offer these, and Helix had the
     compact reading and the separate fields alone. */

  test('a relative reading in a shorter style, named in full', () => {
    const recent = new Date(Date.now() - 3 * 3_600_000 - 60_000).toISOString()
    const served = rendered(
      ssr(
        html`<helix-headless-format-date locale="en-US" date=${recent} relative="narrow"></helix-headless-format-date>`,
      ),
      TAG,
    )
    expect(served).toContain('3h ago')
    expect(served).toContain('aria-label="3 hours ago"')
  })

  test('a number where a word was, when asked', () => {
    const yesterday = new Date(Date.now() - 26 * 3_600_000).toISOString()
    const served = rendered(
      ssr(
        html`<helix-headless-format-date locale="en-US" date=${yesterday} relative="long" numeric="always"></helix-headless-format-date>`,
      ),
      TAG,
    )
    expect(served).toContain('1 day ago')
  })

  test('the locale’s own pattern, and an era', () => {
    const styled = rendered(
      ssr(
        html`<helix-headless-format-date locale="en-US" date="2026-08-04" date-style="full"></helix-headless-format-date>`,
      ),
      TAG,
    )
    expect(styled).toContain('Tuesday, August 4, 2026')
    const era = rendered(
      ssr(
        html`<helix-headless-format-date locale="en-US" date="2026-08-04" year="numeric" era="short"></helix-headless-format-date>`,
      ),
      TAG,
    )
    expect(era).toContain('2026 AD')
  })

  test('a clock other than the locale’s', () => {
    const served = rendered(
      ssr(
        html`<helix-headless-format-date locale="en-US" date="2026-08-04T15:30:00Z" time-zone="UTC" time-style="short" hour-cycle="h23"></helix-headless-format-date>`,
      ),
      TAG,
    )
    expect(served).toContain('15:30')
  })
})
