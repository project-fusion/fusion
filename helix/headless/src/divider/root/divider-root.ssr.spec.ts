import { describe, expect, test } from 'bun:test'
import { partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* Read off the rendered part rather than searched for in the whole string.
 *
 * These were `expect(markup).toContain('role="separator"')`, which the repo's
 * own rules forbid by name: declarative shadow DOM inlines the component's
 * stylesheet into the very markup being asserted, and that stylesheet names
 * every part, host attribute and token the component uses, so a `toContain` on
 * a *selector* passes and says nothing about what rendered. That has produced a
 * false pass twice before, once hiding a stale build for several commits.
 *
 * `partTag` returns the opening tag of one part and nothing else. It is also
 * what makes the assertion say where the role is: on the rule inside the shadow
 * root, which the class documentation is explicit about and the old form could
 * not have distinguished from the host.
 */
describe('divider server output', () => {
  test('an announced separator carries its role in the markup, not on connect', () => {
    // Rendered rather than written onto the host in a lifecycle hook, because
    // the server never runs `connectedCallback`.
    const line = partTag(
      ssr(html`<helix-headless-divider announced></helix-headless-divider>`),
      'line',
    )
    expect(line).toContain('role="separator"')
    expect(line).toContain('aria-orientation="horizontal"')
  })

  test('a plain rule is decoration, and says so', () => {
    const line = partTag(ssr(html`<helix-headless-divider></helix-headless-divider>`), 'line')
    expect(line).toContain('role="presentation"')
    expect(line).not.toContain('aria-orientation')
  })

  test('orientation is decided on the server', () => {
    const line = partTag(
      ssr(html`<helix-headless-divider announced orientation="vertical"></helix-headless-divider>`),
      'line',
    )
    expect(line).toContain('aria-orientation="vertical"')
  })
})
