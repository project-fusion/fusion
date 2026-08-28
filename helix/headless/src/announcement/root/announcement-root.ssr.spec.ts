import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('announcement server output', () => {
  test('the message is in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-announcement>Trial ending</helix-headless-announcement>`),
    )
    expect(markup).toContain('Trial ending')
  })

  test('the dismiss control ships with it, so it works before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-headless-announcement dismissible>x</helix-headless-announcement>`),
        'dismiss',
      ),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the live region go through `ElementInternals`, which writes
    // no attribute at all.
    const markup = ssr(
      html`<helix-headless-announcement tone="warning">x</helix-headless-announcement>`,
    )
    expect(hostAttributes(markup, 'helix-headless-announcement')).toEqual(['tone'])
  })
})
