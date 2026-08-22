import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('avatar server output', () => {
  test('initials are computed on the server, not after hydration', () => {
    // A pure function of the name, so both sides agree without measuring.
    const markup = withoutStyles(ssr(html`<helix-avatar name="Ross Sheppard"></helix-avatar>`))
    expect(markup).toContain('RS')
  })

  test('the host carries nothing the consumer did not write', () => {
    // The name and the role go through `ElementInternals`, which writes no
    // attribute at all. A DOM spec asserts they are announced; what matters
    // here is that the served host is exactly what was typed.
    const markup = ssr(html`<helix-avatar name="Ross Sheppard"></helix-avatar>`)
    expect(hostAttributes(markup, 'helix-avatar')).toEqual(['name'])
  })

  test('an image renders as an image, with the fallback held back', () => {
    // The server cannot know whether an image will load, so it renders the
    // optimistic case and the client corrects on error.
    const markup = ssr(html`<helix-avatar name="Ross" src="/me.avif"></helix-avatar>`)
    expect(partTag(markup, 'image')).toContain('src="/me.avif"')
    expect(partTag(markup, 'initials')).toBe('')
  })
})
