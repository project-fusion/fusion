import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toolbar server output', () => {
  test('the row ships, so the controls in it are laid out before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-headless-toolbar label="Actions"></helix-headless-toolbar>`),
        'toolbar',
      ),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the accessible name go through internals. `data-density` is
    // not written either: the toolbar declares it in CSS rather than as markup.
    expect(
      hostAttributes(
        ssr(html`<helix-headless-toolbar label="Actions"></helix-headless-toolbar>`),
        'helix-headless-toolbar',
      ),
    ).toEqual(['label'])
  })
})
