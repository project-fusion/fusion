import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A description list, served.
 *
 * The pairs are the content, so they are in the server's markup as the
 * elements that carry their meaning, and the host carries nothing the consumer
 * did not write.
 */
describe('description list server output', () => {
  test('the list is a `<dl>` and each item a `<dt>` and its `<dd>`', () => {
    const markup = ssr(html`<helix-headless-description-list>
      <helix-headless-description-list-item label="Owner">Ada</helix-headless-description-list-item>
    </helix-headless-description-list>`)
    expect(partTag(markup, 'list')).toMatch(/^<dl\b/)
    expect(partTag(markup, 'label')).toMatch(/^<dt\b/)
    expect(partTag(markup, 'value')).toMatch(/^<dd\b/)
    expect(withoutStyles(markup)).toContain('Owner')
  })

  test('an unset arrangement writes no attribute onto the host', () => {
    const markup = ssr(html`<helix-headless-description-list></helix-headless-description-list>`)
    expect(hostAttributes(markup, 'helix-headless-description-list')).not.toContain('direction')
  })
})
