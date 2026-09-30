import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('option server output', () => {
  test('the row is served, with a named box for the words to land in', () => {
    /* `toContain('Ross')` was the name the spec itself slotted, so it held for
       any element that renders nothing. Read off a render with no children, the
       only shadow root in the markup is the option's own. */
    const markup = ssr(html`<helix-headless-option value="ross"></helix-headless-option>`)
    expect(hasPart(markup, 'item')).toBe(true)
    expect(rendered(markup, 'helix-headless-option')).toMatch(
      /<span part="label"><slot>(<!--lit-part-->)?(<!--\/lit-part-->)?<\/slot><\/span>/,
    )
  })

  test('a label with nothing in the option is served as the row', () => {
    const markup = ssr(
      html`<helix-headless-option value="sar" label="Search and rescue"></helix-headless-option>`,
    )
    expect(rendered(markup, 'helix-headless-option')).toContain(
      '<slot><!--lit-part-->Search and rescue<!--/lit-part--></slot>',
    )
  })

  test('the host carries only what the consumer wrote', () => {
    // `role="option"` and `aria-selected` go through internals, which write no
    // attribute, so the host is the consumer's markup and hydration agrees.
    expect(
      hostAttributes(
        ssr(html`<helix-headless-option value="ross">Ross</helix-headless-option>`),
        'helix-headless-option',
      ),
    ).toEqual(['value'])
  })

  test('a group serves its own label, which is not one of its options', () => {
    // Against the whole render this passed on the consumer's own
    // `label="Engineering"` in the host tag. The name is the fallback of the
    // label slot, which is in the shadow root and nowhere else.
    const markup = ssr(
      html`<helix-headless-option-group label="Engineering"></helix-headless-option-group>`,
    )
    expect(rendered(markup, 'helix-headless-option-group')).toContain('Engineering')
    expect(hasPart(markup, 'label')).toBe(true)
    expect(hasPart(markup, 'items')).toBe(true)
  })
})

describe('an option with a supporting line', () => {
  test('renders the caption in its own region, served with the row', () => {
    /* A row's second line is content, so it has to be in the markup a reader
       gets before anything upgrades: filled in at hydration it changes the
       height of every row in the list at once. */
    const markup = ssr(
      html`<helix-headless-option value="pro" description="Ten seats and audit logs"
        >Pro</helix-headless-option
      >`,
    )
    expect(hasPart(markup, 'description')).toBe(true)
    expect(rendered(markup, 'helix-headless-option')).toContain('Ten seats and audit logs')
  })

  test('and an option with nothing to add renders no empty region for it', () => {
    /* An empty caption box is a gap under every row in a list that has no
       captions, which is the reason this is a branch rather than a region that
       is always drawn. */
    const markup = ssr(html`<helix-headless-option value="pro">Pro</helix-headless-option>`)
    expect(hasPart(markup, 'description')).toBe(false)
  })
})
