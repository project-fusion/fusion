import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output.
 *
 * **The items are markup, so unlike `helix-data-table` this family serves its
 * content in full**, which is the compensation for not being able to window it:
 * a consumer writes the notifications out and a crawler and a reader on a slow
 * connection both get them.
 *
 * What the server cannot do is count them. `children` is undefined under Lit's
 * element shim, so `unread` is zero there and the mark-all control is not drawn.
 * That is the correct silence rather than a bug: a control that appears on
 * hydration is better than one served for a count nobody could take.
 */

const markup = ssr(html`<helix-headless-notifications label="Activity" mark-all>
  <helix-headless-notification at="2026-08-26T09:00:00.000Z">
    Ada approved your deploy
  </helix-headless-notification>
  <helix-headless-notification default-read>
    Your invitation was accepted
  </helix-headless-notification>
</helix-headless-notifications>`)

describe('notifications server output', () => {
  /** For the reason `Chat`'s spec gives: unknown is not empty. */
  test('no empty state is served over items the server cannot count', () => {
    expect(partTag(markup, 'empty')).toBe('')
  })

  /** Measured: a group read its rows by spreading `children`, which the shim does not have. */
  test('a group renders on a server', () => {
    const grouped = ssr(html`<helix-headless-notifications label="Activity">
      <helix-headless-notification-group collapsible label="Earlier">
        <helix-headless-notification>Build failed</helix-headless-notification>
        <helix-headless-notification>Build passed</helix-headless-notification>
      </helix-headless-notification-group>
    </helix-headless-notifications>`)
    expect(withoutStyles(grouped)).toContain('Build passed')
  })

  test('the region and the list are both served', () => {
    expect(partTag(markup, 'list')).toContain('role="list"')
  })

  test('the content is in the markup, which is what markup children buy', () => {
    const served = withoutStyles(markup)
    expect(served).toContain('Ada approved your deploy')
    expect(served).toContain('Your invitation was accepted')
  })

  test('the hosts write no attributes of their own, so hydration reconciles nothing', () => {
    expect(hostAttributes(markup, 'helix-headless-notifications')).toEqual(['label', 'mark-all'])
    expect(hostAttributes(markup, 'helix-headless-notification')).toEqual(['at'])
  })

  /**
   * The count needs a tree and the server has none, so the control waits for
   * hydration rather than being served against a count of zero.
   */
  test('the mark-all control is not served, because nothing could count the items', () => {
    expect(withoutStyles(markup)).not.toContain('Mark all as read')
  })
})
