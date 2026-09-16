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
    expect(rendered(markup, 'helix-headless-option')).toContain(
      '<span part="label"><slot></slot></span>',
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
