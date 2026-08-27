import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * One notification, served.
 *
 * The timestamp is the interesting one: it is computed against the server's
 * clock, which is a different clock from the reader's and can be a long way from
 * it. `datetime` carries the exact instant either way, so the reading being
 * briefly wrong is a text node hydration replaces rather than a fact the markup
 * gets wrong.
 */

const at = '2020-01-01T00:00:00.000Z'
const markup = ssr(
  html`<helix-headless-notification at=${at} dismissible
    >Something happened</helix-headless-notification
  >`,
)

describe('notification server output', () => {
  test('the content is served', () => {
    expect(withoutStyles(markup)).toContain('Something happened')
  })

  test('the exact instant is in `datetime`, whatever clock computed the reading', () => {
    expect(partTag(markup, 'time')).toContain(`datetime="${at}"`)
  })

  test('the dismiss control is served with its name, since it is markup and not state', () => {
    expect(partTag(markup, 'dismiss')).toContain('aria-label="Dismiss"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-notification')).toEqual(['at', 'dismissible'])
  })
})
