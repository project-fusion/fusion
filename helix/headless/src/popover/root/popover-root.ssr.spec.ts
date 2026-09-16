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

describe('popover server output', () => {
  test('the trigger and the panel both ship, the panel hidden', () => {
    /* Present and hidden rather than absent, so opening after hydration is an
       attribute coming off rather than a subtree arriving. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-popover label="Details">
        <button slot="trigger">Details</button>
        Body
      </helix-headless-popover>`),
    )
    expect(rendered(markup, 'helix-headless-popover')).toContain('name="trigger"')
    expect(hasPart(markup, 'popover')).toBe(true)
    expect(partTag(markup, 'popover')).toContain('hidden')
  })

  test('the panel is a manual popover in the served markup', () => {
    /* `manual`, not `auto`. An `auto` popover light-dismisses itself and closes
       its siblings, which is close to what is wanted and would take dismissal
       away from the host that has to coordinate it. */
    expect(
      partTag(ssr(html`<helix-headless-popover>Body</helix-headless-popover>`), 'popover'),
    ).toContain('popover="manual"')
  })

  test('an open popover serves back what was typed and nothing else', () => {
    // The open state lives in `ElementInternals`, so it writes no attribute.
    expect(
      hostAttributes(
        ssr(html`<helix-headless-popover open>x</helix-headless-popover>`),
        'helix-headless-popover',
      ),
    ).toEqual(['open'])
  })

  test('nothing is written onto the trigger, which is the consumer’s element', () => {
    /* No `aria-expanded`, no generated `id`. A component that decorates markup
       it was given is a component a React consumer's hydration disagrees with,
       and the attribute they would care about most is the one that changes on
       every open. */
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-popover><button slot="trigger">Go</button>Body</helix-headless-popover>`,
      ),
    )
    expect(markup).not.toContain('aria-expanded')
  })
})
