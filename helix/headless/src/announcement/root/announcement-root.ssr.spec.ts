import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('announcement server output', () => {
  test('the message is in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-announcement>Trial ending</helix-base-announcement>`),
    )
    expect(markup).toContain('Trial ending')
  })

  test('the dismiss control ships with it, so it works before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-base-announcement dismissible>x</helix-base-announcement>`),
        'dismiss',
      ),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the live region go through `ElementInternals`, which writes
    // no attribute at all.
    const markup = ssr(html`<helix-base-announcement tone="warning">x</helix-base-announcement>`)
    expect(hostAttributes(markup, 'helix-base-announcement')).toEqual(['tone'])
  })
})
