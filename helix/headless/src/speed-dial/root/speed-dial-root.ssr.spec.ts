import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('speed dial server output', () => {
  test('the trigger ships closed, which is what a fresh load shows', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-speed-dial label="Actions"></helix-base-speed-dial>`),
    )
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('and the actions ship with it, hidden rather than absent', () => {
    /* A crawler and a reader without JavaScript both get the commands, and
       nothing has to arrive after hydration for the set to be complete. */
    const markup = withoutStyles(
      ssr(html`<helix-base-speed-dial label="Actions"></helix-base-speed-dial>`),
    )
    expect(hasPart(markup, 'actions')).toBe(true)
    expect(markup).toContain('hidden')
  })

  test('the host carries nothing the consumer did not write', () => {
    /* `open` is state and does not reflect, and neither does anything the
       element works out for itself: a slotted trigger is told what it is doing
       on the client, where there is a trigger to tell. */
    const markup = ssr(html`<helix-base-speed-dial label="Actions"></helix-base-speed-dial>`)
    expect(hostAttributes(markup, 'helix-base-speed-dial')).toEqual(['label'])
  })

  test('an action ships as a menuitem with its name in the markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-speed-dial-item value="share">Share</helix-base-speed-dial-item>`),
    )
    expect(markup).toContain('role="menuitem"')
    expect(markup).toContain('Share')
  })
})
