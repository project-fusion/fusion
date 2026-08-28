import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('tag server output', () => {
  test('the label is in the served markup', () => {
    const markup = ssr(html`<helix-headless-tag>Draft</helix-headless-tag>`)
    expect(withoutStyles(markup)).toContain('Draft')
  })

  test('a plain tag ships no control', () => {
    expect(hasPart(ssr(html`<helix-headless-tag>Draft</helix-headless-tag>`), 'dismiss')).toBe(
      false,
    )
  })

  test('the dismiss control is named before any JavaScript runs', () => {
    const markup = ssr(html`<helix-headless-tag dismissible>Draft</helix-headless-tag>`)
    expect(partTag(markup, 'dismiss')).toContain('aria-label="Remove"')
  })
})
