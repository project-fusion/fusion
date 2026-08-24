import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('icon button server output', () => {
  test('the accessible name is in the served markup', () => {
    // An icon button has no text, so without the label it announces nothing
    // until JavaScript arrives.
    const markup = ssr(
      html`<helix-headless-icon-button label="Settings">x</helix-headless-icon-button>`,
    )
    expect(partTag(markup, 'button')).toContain('aria-label="Settings"')
  })

  test('it is a button, not a div that listens', () => {
    expect(
      partTag(
        ssr(html`<helix-headless-icon-button label="x">i</helix-headless-icon-button>`),
        'button',
      ),
    ).toContain('type="button"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-icon-button label="Settings">i</helix-headless-icon-button>`,
    )
    expect(hostAttributes(markup, 'helix-headless-icon-button')).toEqual(['label'])
  })
})
