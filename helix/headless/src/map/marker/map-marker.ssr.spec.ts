import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map marker server output', () => {
  test('the place is a named button in the served markup, before any script runs', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-marker label="Depot" lat="37.77" lng="-122.41"></helix-headless-map-marker>`,
      ),
    )
    expect(hasPart(markup, 'marker')).toBe(true)
    expect(partTag(markup, 'marker')).toContain('role="button"')
    expect(rendered(markup, 'helix-headless-map-marker')).toMatch(/part="label"[^>]*>(<!--[^>]*-->)*Depot/)
  })
})
