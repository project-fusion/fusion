import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const item = (open: string) =>
  ssr(html`<helix-headless-accordion>
    <helix-headless-accordion-item ${open === 'open' ? html`default-open` : html``}>
      <span slot="summary">One</span>
      Body
    </helix-headless-accordion-item>
  </helix-headless-accordion>`)

describe('accordion server output', () => {
  test('renders its real state on the server, not after hydration', () => {
    const closed = ssr(
      html`<helix-headless-accordion-item><span slot="summary">S</span>Body</helix-headless-accordion-item>`,
    )
    expect(partTag(closed, 'trigger')).toContain('aria-expanded="false"')

    const open = ssr(
      html`<helix-headless-accordion-item default-open><span slot="summary">S</span>Body</helix-headless-accordion-item>`,
    )
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')
  })

  test('the region the content lands in ships even when closed', () => {
    /* Present for a crawler, and hidden rather than removed so it can animate.

       `toContain('Body')` read the item's own light-DOM child back out of the
       render, so it passed with the item rendering no content region and no
       slot at all. Read off an item with no children, so the only shadow root
       here is the item's own. */
    const closed = ssr(html`<helix-headless-accordion-item></helix-headless-accordion-item>`)
    expect(rendered(closed, 'helix-headless-accordion-item')).toMatch(
      /<div part="content-inner">\s*<slot><\/slot>/,
    )
  })

  test('a closed section is closed with no stylesheet at all', () => {
    /* The headless tier's whole claim. `inert` takes the region out of the
       accessibility tree and off the tab order while leaving every pixel of it
       on screen. Without it a consumer bringing their own CSS gets two sections
       permanently open under a trigger reporting `aria-expanded="false"`: the
       collapse lives in a sheet's `grid-template-rows`, which hides things as a
       side effect of an animation.

       Asserted on the part's own tag rather than on the markup, because the
       inlined stylesheet names both attributes and `toContain` would pass on a
       selector. */
    const closed = ssr(
      html`<helix-headless-accordion-item><span slot="summary">S</span>Body</helix-headless-accordion-item>`,
    )
    expect(partTag(closed, 'content')).toContain('hidden')
    expect(partTag(closed, 'content')).toContain('inert')

    const open = ssr(
      html`<helix-headless-accordion-item default-open><span slot="summary">S</span>Body</helix-headless-accordion-item>`,
    )
    expect(partTag(open, 'content')).not.toContain('hidden')
    expect(partTag(open, 'content')).not.toContain('inert')
  })

  test('the region is named by its trigger, inside one shadow root', () => {
    // IDREFs do not cross a shadow boundary, so both ids have to live together.
    const markup = ssr(
      html`<helix-headless-accordion-item><span slot="summary">S</span>x</helix-headless-accordion-item>`,
    )
    expect(partTag(markup, 'trigger')).toContain('aria-controls="content"')
    expect(partTag(markup, 'content')).toContain('aria-labelledby="trigger"')
    expect(partTag(markup, 'content')).toContain('role="region"')
  })

  test('a closed section find in page searches is served with no landmark', () => {
    const markup = ssr(
      html`<helix-headless-accordion-item hidden-until-found><span slot="summary">S</span>x</helix-headless-accordion-item>`,
    )
    expect(partTag(markup, 'content')).toContain('hidden="until-found"')
    expect(partTag(markup, 'content')).not.toContain('role=')
    expect(partTag(markup, 'content')).not.toContain('aria-labelledby')
  })

  test('the accordion renders without walking children it cannot see', () => {
    expect(hasPart(item('closed'), 'container')).toBe(true)
  })
})
