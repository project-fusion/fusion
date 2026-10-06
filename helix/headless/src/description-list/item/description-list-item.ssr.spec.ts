import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * One pair, served.
 *
 * A pair is content and nothing about it waits on a document, so all of it is in
 * the first response: the term, the description, and the label a consumer wrote
 * as a property rather than as slotted content.
 */
describe('description list item server output', () => {
  test('the label is a `<dt>` and the value the `<dd>` after it', () => {
    const markup = ssr(
      html`<helix-headless-description-list-item label="Owner"
        >Ada</helix-headless-description-list-item
      >`,
    )
    expect(partTag(markup, 'label')).toMatch(/^<dt\b/)
    expect(partTag(markup, 'value')).toMatch(/^<dd\b/)
  })

  /* The property is the slot's fallback, so it is drawn by the server rather
     than written in on hydration: a crawler reads "Owner" and so does a reader
     whose script never arrives. */
  test('a label given as text is in the markup', () => {
    const markup = ssr(
      html`<helix-headless-description-list-item label="Owner"
        >Ada</helix-headless-description-list-item
      >`,
    )
    /* Off the item's own render, not out of the document: `label="Owner"` is on
       the host two characters away, so a whole-render search for the word passes
       whether or not the `<dt>` was given anything to show. */
    expect(rendered(markup, 'helix-headless-description-list-item')).toMatch(
      /<slot name="label">(<!--[^>]*-->)*Owner/,
    )
  })

  test('the host declares nothing of its own', () => {
    const markup = ssr(
      html`<helix-headless-description-list-item></helix-headless-description-list-item>`,
    )
    expect(hostAttributes(markup, 'helix-headless-description-list-item')).toEqual([])
  })

  test('several values of your own are served unwrapped, where `several` says so', () => {
    const tag = 'helix-headless-description-list-item'
    const own = ssr(
      html`<helix-headless-description-list-item label="Authors" several
        ><dd>Ada</dd><dd>Grace</dd></helix-headless-description-list-item
      >`,
    )
    expect(partTag(own, 'value')).toBe('')
    expect(rendered(own, tag)).toMatch(/<\/dt>(<!--[^>]*-->)*<slot/)
    const unsaid = ssr(
      html`<helix-headless-description-list-item label="Authors"
        ><dd>Ada</dd><dd>Grace</dd></helix-headless-description-list-item
      >`,
    )
    expect(partTag(unsaid, 'value')).toMatch(/^<dd\b/)
  })

  test('the controls slot sits inside the value, after it', () => {
    const markup = ssr(
      html`<helix-headless-description-list-item label="Id"
        >a1b2<button slot="actions">Copy</button></helix-headless-description-list-item
      >`,
    )
    expect(rendered(markup, 'helix-headless-description-list-item')).toMatch(
      /<dd part="value">((?!<\/dd>)[\s\S])*<slot\s*><\/slot>((?!<\/dd>)[\s\S])*<slot name="actions">/,
    )
  })
})
