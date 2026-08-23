import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toast server output', () => {
  test('the region ships whether or not it holds anything', () => {
    /* The whole reason the region is part of this family. A live region has to
       be in the document before a message is put into it, so one that arrives
       with its first message is one that is frequently not announced. Serving
       the empty region is what makes the first toast of a session work. */
    expect(
      hasPart(ssr(html`<helix-base-toast label="Notifications"></helix-base-toast>`), 'region'),
    ).toBe(true)
  })

  test('messages already there are served with it', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-base-toast
          ><helix-base-toast-item tone="success">Saved</helix-base-toast-item></helix-base-toast
        >`,
      ),
    )
    expect(markup).toContain('Saved')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-base-toast label="Notifications" placement="top-center"></helix-base-toast>`,
        ),
        'helix-base-toast',
      ),
    ).toEqual(['label', 'placement'])
  })

  /* **The test above passes a placement, so it could never catch the fault it
     looks like it is about.** `placement` reflected *and* defaulted, which is
     the pair that writes: every toast region anybody rendered gained a
     `placement="bottom-end"` nobody typed, and a React consumer's server markup
     does not have it. Asserting the attributes of a host that was given one
     says nothing about the host that was not. */
  test('and nothing at all where the consumer wrote nothing', () => {
    expect(
      hostAttributes(ssr(html`<helix-base-toast></helix-base-toast>`), 'helix-base-toast'),
    ).toEqual([])
  })

  test('a message serves its dismiss control, so it works before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-base-toast-item dismissible>Saved</helix-base-toast-item>`),
        'dismiss',
      ),
    ).toBe(true)
  })
})
