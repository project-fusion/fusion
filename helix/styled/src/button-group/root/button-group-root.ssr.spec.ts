import { describe, expect, test } from 'bun:test'
import { hostAttributes, hostTag, ssr, styles, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('button group server output', () => {
  const served = ssr(
    html`<helix-button-group label="Record actions" variant="spaced">
      <helix-button>Save</helix-button>
    </helix-button-group>`,
  )
  const markup = withoutStyles(served)

  test('the group is one slot, so the buttons are served as the consumer wrote them', () => {
    expect(markup).toContain('<slot>')
    expect(markup).toContain('<helix-button')
    expect(markup).toContain('Save')
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
    expect(markup).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--button-group-gap')
  })
})
