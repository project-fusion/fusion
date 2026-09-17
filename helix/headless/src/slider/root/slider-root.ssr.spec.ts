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

const TAG = 'helix-headless-slider'

describe('slider server output', () => {
  test('the range ships with its bounds, not just its value', () => {
    /* A range whose min and max arrive on hydration jumps: the browser clamps
       the value against the defaults of 0 and 100 first.

       Each attribute named whole, because `toContain('50')` is satisfied by any
       number with those digits anywhere in the tag, `value="150"` included. */
    const control = partTag(
      ssr(html`<helix-headless-slider max="200" min="50" value="120"></helix-headless-slider>`),
      'control',
    )
    expect(control).toMatch(/<input/)
    expect(control).toContain('min="50"')
    expect(control).toContain('max="200"')
  })

  test('the value the consumer wrote is in the served control', () => {
    // The question this cohort settled: a field whose value arrives on hydration
    // is a field that is empty for as long as the script takes.
    const control = partTag(
      ssr(html`<helix-headless-slider name="volume" value="30"></helix-headless-slider>`),
      'control',
    )
    expect(control).toContain('value="30"')
    expect(control).toContain('name="volume"')
  })

  test('the midpoint is seeded on the server, so the handle and the value agree', () => {
    /* A range with no value shows its own midpoint whatever anything else says,
       which is the platform's rule. Seeded in `willUpdate`, which SSR runs, so
       the served value is the one under the served handle. */
    const control = partTag(
      ssr(html`<helix-headless-slider max="60" min="0"></helix-headless-slider>`),
      'control',
    )
    expect(control).toContain('value="30"')
  })

  test('the label is served and names the control', () => {
    const markup = ssr(html`<helix-headless-slider label="Volume"></helix-headless-slider>`)
    expect(partTag(markup, 'label')).toMatch(/<label\s/)
    expect(namesControl(markup)).toBe(true)
    expect(rendered(markup, TAG)).toContain('Volume')
  })

  test('disabled is on the served control, and `required` is not, because a range has no empty', () => {
    /* The cohort's third question, and this family's answer differs from the
       fields' for a reason worth stating rather than leaving to be noticed.
       `disabled` goes on the control, so a form is not fillable before it
       upgrades. `required` does not apply to a range in HTML and could not fail
       here in any case: `willUpdate` seeds the midpoint, so the control is never
       without a value. It stays on the host, where the field sheet draws the
       marker from `:host([required])`. */
    const markup = ssr(
      html`<helix-headless-slider disabled label="Volume" required></helix-headless-slider>`,
    )
    expect(partTag(markup, 'control')).toContain('disabled')
    expect(partTag(markup, 'control')).not.toContain('required')
    expect(hostAttributes(markup, TAG)).toContain('required')
  })

  test('the readout ships with the value, rather than filling in on the client', () => {
    const markup = ssr(
      html`<helix-headless-slider label="Volume" show-value value="30"></helix-headless-slider>`,
    )
    expect(partTag(markup, 'output')).toContain('for="control"')
    expect(rendered(markup, TAG)).toContain('>30<')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-slider label="Volume" name="v"></helix-headless-slider>`,
    )
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'name'])
  })

  test('markers are rendered on the server, since they are layout', () => {
    expect(
      hasPart(ssr(html`<helix-headless-slider markers="5"></helix-headless-slider>`), 'markers'),
    ).toBe(true)
  })

  test('one marker is none, so the row is not drawn for it', () => {
    expect(
      hasPart(ssr(html`<helix-headless-slider markers="1"></helix-headless-slider>`), 'markers'),
    ).toBe(false)
  })
})
