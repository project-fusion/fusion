import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A comparison, served, and what it owes a server is nothing at all.
 *
 * **Which makes the assertion the unusual one, so it is worth naming.** Every
 * other part in this family owes the frame it draws; this one draws no frame,
 * because rendering nothing is the whole mechanism that keeps a schema written
 * in markup off the page. So the claim is the empty render, asserted as
 * everything rather than as a part somebody thought of, and the second claim is
 * that getting there did not throw: `render` returning `nothing` is only an
 * empty render if the element reached it.
 */
describe('filter operator server output', () => {
  test('renders nothing, which is what keeps a declaration off the page', () => {
    const markup = ssr(
      html`<helix-headless-filter-operator name="any" label="is any of" default>
        is any of
      </helix-headless-filter-operator>`,
    )
    expect(servedParts(markup)).toEqual([])
    /* The words the consumer wrote inside are still in the document, being
       their own markup, and they are not assigned to anything: there is no
       slot to assign them to. So the shadow root is what the claim is about,
       and `rendered` is what takes the host's opening tag off it. */
    expect(rendered(markup, 'helix-headless-filter-operator')).not.toContain('<slot')
  })

  test('the host carries only what the consumer wrote', () => {
    // `role="none"` goes through internals, which write no attribute, and no
    // reflected property here carries a default, so the server's markup and the
    // client's cannot disagree about the host.
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-filter-operator
            name="any"
            label="is any of"
          ></helix-headless-filter-operator>`,
        ),
        'helix-headless-filter-operator',
      ),
    ).toEqual(['label', 'name'])
  })
})
