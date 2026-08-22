import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const item = (open: string) =>
  ssr(html`<helix-accordion>
    <helix-accordion-item ${open === 'open' ? html`default-open` : html``}>
      <span slot="summary">One</span>
      Body
    </helix-accordion-item>
  </helix-accordion>`)

describe('accordion server output', () => {
  test('renders its real state on the server, not after hydration', () => {
    const closed = ssr(
      html`<helix-accordion-item><span slot="summary">S</span>Body</helix-accordion-item>`,
    )
    expect(partTag(closed, 'trigger')).toContain('aria-expanded="false"')

    const open = ssr(
      html`<helix-accordion-item default-open><span slot="summary">S</span>Body</helix-accordion-item>`,
    )
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')
  })

  test('content is in the markup even when closed', () => {
    // Present for a crawler, and hidden rather than removed so it can animate.
    const closed = withoutStyles(
      ssr(html`<helix-accordion-item><span slot="summary">S</span>Body</helix-accordion-item>`),
    )
    expect(closed).toContain('Body')
  })

  test('a closed section is closed with no stylesheet at all', () => {
    /* The headless tier's whole claim. `inert` takes the region out of the
       accessibility tree and off the tab order and leaves every pixel of it on
       screen, so for a consumer who brings their own CSS it was two sections
       permanently open under a trigger reporting `aria-expanded="false"`. The
       collapse was living in the styled tier's `grid-template-rows`, which is
       an animation that was hiding things as a side effect.

       Asserted on the part's own tag rather than on the markup, because the
       inlined stylesheet names both attributes and `toContain` would pass on a
       selector. */
    const closed = ssr(
      html`<helix-accordion-item><span slot="summary">S</span>Body</helix-accordion-item>`,
    )
    expect(partTag(closed, 'content')).toContain('hidden')
    expect(partTag(closed, 'content')).toContain('inert')

    const open = ssr(
      html`<helix-accordion-item default-open><span slot="summary">S</span>Body</helix-accordion-item>`,
    )
    expect(partTag(open, 'content')).not.toContain('hidden')
    expect(partTag(open, 'content')).not.toContain('inert')
  })

  test('the region is named by its trigger, inside one shadow root', () => {
    // IDREFs do not cross a shadow boundary, so both ids have to live together.
    const markup = ssr(
      html`<helix-accordion-item><span slot="summary">S</span>x</helix-accordion-item>`,
    )
    expect(partTag(markup, 'trigger')).toContain('aria-controls="content"')
    expect(partTag(markup, 'content')).toContain('aria-labelledby="trigger"')
    expect(partTag(markup, 'content')).toContain('role="region"')
  })

  test('the accordion renders without walking children it cannot see', () => {
    expect(hasPart(item('closed'), 'container')).toBe(true)
  })
})
