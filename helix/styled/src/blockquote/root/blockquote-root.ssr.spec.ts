import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('blockquote server output', () => {
  const served = ssr(
    html`<helix-blockquote cite="https://x.test">
      Said so.
      <span slot="attribution">A</span>
    </helix-blockquote>`,
  )
  const markup = withoutStyles(served)

  test('the passage is a blockquote with its source before any script runs', () => {
    expect(partTag(markup, 'blockquote')).toMatch(/^<blockquote\s/)
    expect(partTag(markup, 'blockquote')).toContain('cite="https://x.test"')
    expect(markup).toContain('Said so.')
  })

  test('the footer ships unmarked, since only a client can see whether it is filled', () => {
    /* The server has no children to inspect, so it cannot know whether the
       attribution slot is filled. The honest output is the footer as rendered,
       and the client marks it once it can look. */
    expect(hasPart(markup, 'attribution')).toBe(true)
    expect(partTag(markup, 'attribution')).not.toContain('data-empty')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-blockquote')).toEqual(['cite'])
    expect(
      hostAttributes(ssr(html`<helix-blockquote>x</helix-blockquote>`), 'helix-blockquote'),
    ).toEqual([])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--blockquote-size')
  })
})
