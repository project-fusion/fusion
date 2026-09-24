import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('announcement server output', () => {
  test('the region the message lands in is served', () => {
    /* `toContain('Trial ending')` read the host's own light-DOM child back out
       of the render, so it passed with the announcement rendering no slot at
       all. Read off one with no children: the only shadow root is its own. */
    const markup = ssr(html`<helix-headless-announcement></helix-headless-announcement>`)
    expect(rendered(markup, 'helix-headless-announcement')).toMatch(
      /<div part="content">(?:<!--lit-node \d+-->)?<slot\s*><\/slot><\/div>/,
    )
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
