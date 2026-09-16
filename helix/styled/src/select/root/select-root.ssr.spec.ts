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

  test('the trigger’s words come from the placeholder, since options are children', () => {
    // The server cannot see light-DOM children, so a value it cannot resolve
    // has to fall back to something rather than render blank.
    const markup = ssr(
      html`<helix-select placeholder="Choose an owner" value="ross"></helix-select>`,
    )
    expect(partTag(markup, 'value')).not.toBe('')
    expect(rendered(markup, TAG)).toContain('Choose an owner')
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
