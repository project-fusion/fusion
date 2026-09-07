import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('filter input server output', () => {
  test('the field is usable before any script loads', () => {
    const markup = ssr(
      html`<helix-headless-filter-input
        label="Filter rows"
        placeholder="Add a filter"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'field')).toBe(true)
    expect(partTag(markup, 'control')).toContain('placeholder="Add a filter"')
    expect(withoutStyles(markup)).toContain('Filter rows')
  })

  test('the row is served whether or not anything is in it', () => {
    /* A slot that is not in the served markup assigns nothing, so the tokens a
       consumer wrote would be invisible until hydration. */
    const markup = ssr(
      html`<helix-headless-filter-input label="Filter rows"></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'tags')).toBe(true)
    expect(withoutStyles(markup)).toContain('name="tags"')
  })

  test('the count waits for a client, having nothing to count without one', () => {
    // Slot assignment is the browser's, so the server cannot know what overflowed.
    const markup = ssr(
      html`<helix-headless-filter-input
        label="Filter rows"
        max-tags="1"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'rest')).toBe(false)
  })

  test('the clear button waits for a value, so an empty field ships none', () => {
    const markup = ssr(
      html`<helix-headless-filter-input
        clearable
        label="Filter rows"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'clear')).toBe(false)
  })
})
