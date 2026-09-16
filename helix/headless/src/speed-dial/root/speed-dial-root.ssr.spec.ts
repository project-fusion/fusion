import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('speed dial server output', () => {
  test('the trigger ships closed, which is what a fresh load shows', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-speed-dial label="Actions"></helix-headless-speed-dial>`),
    )
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
    expect(partTag(markup, 'trigger')).toContain('aria-haspopup="menu"')
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('and the actions ship with it, hidden rather than absent', () => {
    /* A crawler and a reader without JavaScript both get the commands, and
       nothing has to arrive after hydration for the set to be complete. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-speed-dial label="Actions"></helix-headless-speed-dial>`),
    )
    expect(hasPart(markup, 'actions')).toBe(true)
    expect(partTag(markup, 'actions')).toContain('hidden')
  })

  test('the host carries nothing the consumer did not write', () => {
    /* `open` is state and does not reflect, and neither does anything the
       element works out for itself: a slotted trigger is told what it is doing
       on the client, where there is a trigger to tell. */
    const markup = ssr(
      html`<helix-headless-speed-dial label="Actions"></helix-headless-speed-dial>`,
    )
    expect(hostAttributes(markup, 'helix-headless-speed-dial')).toEqual(['label'])
  })

  test('an action ships as a menuitem, with a named box for its name', () => {
    /* `toContain('Share')` was the word the spec itself slotted, so it held for
       an element rendering nothing. Read off a render with no children, what
       the action owes is the label box the word is projected into. */
    const markup = ssr(
      html`<helix-headless-speed-dial-item value="share"></helix-headless-speed-dial-item>`,
    )
    expect(partTag(markup, 'item')).toContain('role="menuitem"')
    expect(rendered(markup, 'helix-headless-speed-dial-item')).toContain(
      '<span part="label"><slot></slot></span>',
    )
  })
})
