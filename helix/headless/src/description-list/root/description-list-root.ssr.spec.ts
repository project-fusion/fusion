import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
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
  const markup = ssr(html`<helix-headless-description-list>
    <helix-headless-description-list-item label="Owner">Ada</helix-headless-description-list-item>
  </helix-headless-description-list>`)

  test('the list is a `<dl>` and each item a `<dt>` and its `<dd>`', () => {
    expect(partTag(markup, 'list')).toMatch(/^<dl\b/)
    expect(partTag(markup, 'label')).toMatch(/^<dt\b/)
    expect(partTag(markup, 'value')).toMatch(/^<dd\b/)
  })

  test('the label is served as the fallback of the slot that replaces it', () => {
    /* `toContain('Owner')` on the whole render passed on the item's own
       `label="Owner"`, two characters away in the host tag, so it held with
       the item rendering no label at all. The host tag is what `rendered`
       takes off, which leaves the `<dt>` as the only place the word can be. */
    expect(rendered(markup, 'helix-headless-description-list-item')).toMatch(
      /<slot name="label">(<!--[^>]*-->)*Owner/,
    )
  })

  test('an unset arrangement writes no attribute onto the host', () => {
    const bare = ssr(html`<helix-headless-description-list></helix-headless-description-list>`)
    expect(hostAttributes(bare, 'helix-headless-description-list')).not.toContain('direction')
  })

  test('a label writes nothing onto the host beyond what the consumer wrote', () => {
    const named = ssr(
      html`<helix-headless-description-list label="Server details"></helix-headless-description-list>`,
    )
    expect(hostAttributes(named, 'helix-headless-description-list')).toEqual(['label'])
  })

  /* A server cannot see the consumer's `<dd>` elements, so it serves the
     item's own around them, and the item lets go of it once it runs. */
  test('an item with several values is served with its own `<dd>`', () => {
    const served = ssr(html`<helix-headless-description-list-item label="Authors"
      ><dd>Ada</dd><dd>Grace</dd></helix-headless-description-list-item
    >`)
    expect(partTag(served, 'value')).toMatch(/^<dd\b/)
  })
})
