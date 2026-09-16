import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  hostTag,
  rendered,
  servedParts,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('button group server output', () => {
  const served = ssr(
    html`<helix-button-group label="Record actions" variant="spaced">
      <helix-button>Save</helix-button>
    </helix-button-group>`,
  )
  const markup = withoutStyles(served)

  test('the group is one slot and no box of its own, so the buttons are served untouched', () => {
    /* `toContain('<helix-button')` and `toContain('Save')` both passed on the
       spec's own light DOM, which is in the response whatever the group
       renders. What the group owes is the other half of the claim: a shadow
       root that is one unnamed slot and renders no part of its own, so nothing
       wraps or reorders what it was handed. Read off a childless render, so the
       only shadow root here is the group's. */
    const bare = ssr(html`<helix-button-group label="Record actions"></helix-button-group>`)
    expect(rendered(bare, 'helix-button-group')).toContain('<slot></slot>')
    expect(servedParts(bare)).toEqual([])
  })

  test('the host carries only what the consumer wrote', () => {
    // `variant` and `orientation` reflect with no default, so a bare group
    // writes nothing and a written one echoes what it was given.
    expect(hostAttributes(served, 'helix-button-group')).toEqual(['label', 'variant'])
    expect(
      hostAttributes(ssr(html`<helix-button-group>x</helix-button-group>`), 'helix-button-group'),
    ).toEqual([])
  })

  test('the role is on internals, so nothing is written onto the host', () => {
    expect(hostTag(markup, 'helix-button-group')).not.toContain('role=')
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(rendered(markup, 'helix-button-group')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--button-group-gap')
  })
})
