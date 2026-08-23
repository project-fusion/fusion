import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('tag server output', () => {
  test('the label is in the served markup', () => {
    const markup = ssr(html`<helix-base-tag>Draft</helix-base-tag>`)
    expect(withoutStyles(markup)).toContain('Draft')
  })

  test('a plain tag ships no control', () => {
    expect(hasPart(ssr(html`<helix-base-tag>Draft</helix-base-tag>`), 'dismiss')).toBe(false)
  })

  test('the dismiss control is named before any JavaScript runs', () => {
    const markup = ssr(html`<helix-base-tag dismissible>Draft</helix-base-tag>`)
    expect(partTag(markup, 'dismiss')).toContain('aria-label="Remove"')
  })
})
