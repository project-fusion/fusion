import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('flex server output', () => {
  test('layout is plain CSS, so it holds before the element upgrades', () => {
    /* Asked of the host's attributes rather than searched for in the markup.
     *
     * `toContain('direction="column"')` is satisfied by the literal text of the
     * template being rendered: the test passed with no element defined at all,
     * and would have gone on passing if the component stopped reflecting
     * anything. `hostAttributes` reads what the server actually wrote onto the
     * tag, which is the claim. */
    const attributes = hostAttributes(
      ssr(html`<helix-flex direction="column" gap="md">x</helix-flex>`),
      'helix-flex',
    )
    expect(attributes).toEqual(['direction', 'gap'])
  })

  test('the host carries nothing the consumer did not write', () => {
    // Every axis is a reflected property with no default, so an unset one
    // writes no attribute and hydration has nothing to reconcile.
    expect(hostAttributes(ssr(html`<helix-flex>x</helix-flex>`), 'helix-flex')).toEqual([])
  })

  test('the content is served, not built on the client', () => {
    expect(withoutStyles(ssr(html`<helix-flex>Contents</helix-flex>`))).toContain('Contents')
  })
})
