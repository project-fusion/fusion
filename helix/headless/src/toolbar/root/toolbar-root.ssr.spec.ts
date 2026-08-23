import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toolbar server output', () => {
  test('the row ships, so the controls in it are laid out before hydration', () => {
    expect(
      hasPart(ssr(html`<helix-base-toolbar label="Actions"></helix-base-toolbar>`), 'toolbar'),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the accessible name go through internals. `data-density` is
    // not written either: the toolbar declares it in CSS rather than as markup.
    expect(
      hostAttributes(
        ssr(html`<helix-base-toolbar label="Actions"></helix-base-toolbar>`),
        'helix-base-toolbar',
      ),
    ).toEqual(['label'])
  })
})
