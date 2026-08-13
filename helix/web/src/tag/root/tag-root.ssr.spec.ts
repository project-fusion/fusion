import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('tag server output', () => {
  test('the label is in the served markup', () => {
    const markup = ssr(html`<helix-tag>Draft</helix-tag>`)
    expect(hasPart(markup, 'tag')).toBe(true)
    expect(withoutStyles(markup)).toContain('Draft')
  })

  test('a plain tag ships no control', () => {
    expect(hasPart(ssr(html`<helix-tag>Draft</helix-tag>`), 'remove')).toBe(false)
  })

  test('the remove control is named before any JavaScript runs', () => {
    const markup = ssr(html`<helix-tag removable>Draft</helix-tag>`)
    expect(partTag(markup, 'remove')).toContain('aria-label="Remove"')
  })
})
