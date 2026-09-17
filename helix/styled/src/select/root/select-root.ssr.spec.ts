import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  namesControl,
  partTag,
  rendered,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-select'

describe('select server output', () => {
  test('the trigger ships as a real button, closed', () => {
    const trigger = partTag(ssr(html`<helix-select label="Owner"></helix-select>`), 'trigger')
    expect(trigger).toMatch(/<button/)
    expect(trigger).toContain('aria-expanded="false"')
  })

  test('the surface ships hidden rather than not at all', () => {
    // Present and hidden, so opening it after hydration is an attribute coming
    // off rather than a subtree arriving.
    const markup = ssr(html`<helix-select label="Owner"></helix-select>`)
    expect(hasPart(markup, 'surface')).toBe(true)
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  test('the placeholder stands over no value and says nothing over a declared one', () => {
    /* The server cannot see light-DOM children, so a value it cannot resolve
       has no words to show. What it had instead was the placeholder, on the
       argument that the trigger has to fall back to something rather than
       render blank, and the box is the part of that argument that holds: an
       empty trigger that gains a word is not a layout moving.

       The rest of it does not. A placeholder says nothing is chosen, and over a
       declared `value` that is false, which this test asked for by name. So the
       placeholder where there is genuinely no value, the one case a server is
       sure of, and an empty box where there is a value whose word cannot be
       read. `Combobox` makes the same trade in the same position. */
    const declared = ssr(
      html`<helix-select placeholder="Choose an owner" value="ross"></helix-select>`,
    )
    expect(partTag(declared, 'value')).not.toBe('')
    expect(rendered(declared, TAG)).not.toContain('Choose an owner')
    expect(rendered(declared, TAG)).not.toContain('ross')
    const empty = ssr(html`<helix-select placeholder="Choose an owner"></helix-select>`)
    expect(rendered(empty, TAG)).toContain('Choose an owner')
  })

  test('the label is served and names the trigger', () => {
    // The trigger carries `id="control"` so the label can point at it: a select
    // is one control, and what a reader lands on is the button.
    const markup = ssr(html`<helix-select label="Owner"></helix-select>`)
    expect(namesControl(markup)).toBe(true)
    expect(rendered(markup, TAG)).toContain('Owner')
  })

  test('a disabled select ships unpressable, rather than becoming so on upgrade', () => {
    expect(
      partTag(ssr(html`<helix-select disabled label="Owner"></helix-select>`), 'trigger'),
    ).toContain('disabled')
  })

  test('required is not in the markup, because a button cannot carry it', () => {
    /* Said out loud rather than left out. `required` is reported through
       `ElementInternals`, which no server writes, so a required select looks
       optional until it upgrades and there is nothing in the markup to fix that:
       a `<button>` has no `required` and inventing one would be an attribute the
       platform ignores. The half a server can serve is the name and the closed
       state, above. */
    const trigger = partTag(
      ssr(html`<helix-select label="Owner" required></helix-select>`),
      'trigger',
    )
    expect(trigger).not.toContain('required')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-select label="Owner" name="owner" value="ross"></helix-select>`)
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'name', 'value'])
  })
})
