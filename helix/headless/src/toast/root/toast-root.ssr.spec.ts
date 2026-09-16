import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toast server output', () => {
  test('the region ships whether or not it holds anything', () => {
    /* The whole reason the region is part of this family. A live region has to
       be in the document before a message is put into it, so one that arrives
       with its first message is one that is frequently not announced. Serving
       the empty region is what makes the first toast of a session work. */
    expect(
      hasPart(
        ssr(html`<helix-headless-toast label="Notifications"></helix-headless-toast>`),
        'region',
      ),
    ).toBe(true)
  })

  test('the region projects messages already there, rather than drawing them', () => {
    /* `toContain('Saved')` was the word the spec itself slotted, in the document
       whatever the region did with it. What the region owes is the slot inside
       it, and a message the box it projects its words into, both read off
       renders with no children. */
    expect(
      rendered(ssr(html`<helix-headless-toast></helix-headless-toast>`), 'helix-headless-toast'),
    ).toContain('<div part="region"><slot></slot></div>')
    expect(
      rendered(
        ssr(html`<helix-headless-toast-item tone="success"></helix-headless-toast-item>`),
        'helix-headless-toast-item',
      ),
    ).toContain('<div part="content"><slot></slot></div>')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-toast label="Notifications" placement="top-center"></helix-headless-toast>`,
        ),
        'helix-headless-toast',
      ),
    ).toEqual(['label', 'placement'])
  })

  /* **The test above passes a placement, so it could never catch the fault it
     looks like it is about.** A property that reflects *and* defaults writes an
     attribute nobody typed, `placement="bottom-end"` on every toast region, and
     a React consumer's server markup does not have it. Asserting the attributes
     of a host that was given one says nothing about the host that was not. */
  test('and nothing at all where the consumer wrote nothing', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-toast></helix-headless-toast>`),
        'helix-headless-toast',
      ),
    ).toEqual([])
  })

  test('a message serves its dismiss control, so it works before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-headless-toast-item dismissible>Saved</helix-headless-toast-item>`),
        'dismiss',
      ),
    ).toBe(true)
  })
})
