import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('textarea server output', () => {
  test('the control ships, so the field is usable before hydration', () => {
    const markup = ssr(html`<helix-headless-textarea label="Notes"></helix-headless-textarea>`)
    expect(hasPart(markup, 'field')).toBe(true)
    expect(partTag(markup, 'control')).toMatch(/<textarea/)
  })

  test('the label is in the served HTML', () => {
    // Against the whole render this passed on the consumer's own `label="Notes"`
    // in the host tag. The words are the fallback of the label slot, which is
    // in the shadow root and nowhere else.
    const markup = ssr(html`<helix-headless-textarea label="Notes"></helix-headless-textarea>`)
    expect(hasPart(markup, 'label')).toBe(true)
    expect(rendered(markup, 'helix-headless-textarea')).toContain('Notes')
  })

  test('rows reaches the textarea rather than staying on the host', () => {
    expect(
      partTag(ssr(html`<helix-headless-textarea rows="6"></helix-headless-textarea>`), 'control'),
    ).toContain('rows="6"')
  })

  test('the hint ships and the feedback does not, because nothing has failed yet', () => {
    const markup = ssr(html`<helix-headless-textarea hint="Two lines"></helix-headless-textarea>`)
    expect(hasPart(markup, 'hint')).toBe(true)
    expect(hasPart(markup, 'feedback')).toBe(false)
  })

  test('the wrapping pair reaches the textarea together', () => {
    /* `wrap="hard"` is the one value that changes what is submitted, inserting
       the breaks the reader saw, and the platform only honors it beside a
       `cols`. Neither is read by this component, so both exist solely to cross
       the boundary: a binding that stopped forwarding would submit soft-wrapped
       text with nothing to say it had. */
    const markup = partTag(
      ssr(html`<helix-headless-textarea cols="40" wrap="hard"></helix-headless-textarea>`),
      'control',
    )
    expect(markup).toContain('cols="40"')
    expect(markup).toContain('wrap="hard"')
  })

  test('a textarea nobody sized carries no cols', () => {
    // The layout decides the width, and `cols` written back at its own default
    // would pin every field at twenty characters.
    const markup = partTag(
      ssr(html`<helix-headless-textarea></helix-headless-textarea>`),
      'control',
    )
    expect(markup).not.toContain('cols=')
  })

  test('the constraint attributes and autocomplete reach the real textarea', () => {
    /* The browser anchors the lengths and reports `tooShort` and `tooLong` in
       the reader's own language, and autofill reads its token off the parsed
       markup before anything upgrades. All three are handed over rather than
       interpreted here. */
    const markup = partTag(
      ssr(
        html`<helix-headless-textarea
          autocomplete="street-address"
          maxlength="500"
          minlength="20"
        ></helix-headless-textarea>`,
      ),
      'control',
    )
    expect(markup).toContain('autocomplete="street-address"')
    expect(markup).toContain('minlength="20"')
    expect(markup).toContain('maxlength="500"')
  })

  test('dirname is not forwarded, because the inner control participates in no form', () => {
    /* The one property in this group that must *not* cross the boundary. The
       host is form-associated and reports its own value, so the `<textarea>` in
       here has no form owner and a `dirname` on it would look right and submit
       nothing. The second entry goes through `setFormValue`, which the DOM spec
       reads. */
    const markup = ssr(
      html`<helix-headless-textarea dirname="notes.dir" name="notes"></helix-headless-textarea>`,
    )
    expect(partTag(markup, 'control')).not.toContain('dirname')
  })

  test('the field serves a start and an end slot either side of the text', () => {
    const shown = rendered(
      ssr(html`<helix-headless-textarea label="Notes"></helix-headless-textarea>`),
      'helix-headless-textarea',
    )
    expect(shown).toMatch(/<slot name="start"><\/slot>\s*(<!--[^>]*-->\s*)*<textarea/)
    expect(shown).toMatch(/<\/textarea>\s*(<!--[^>]*-->\s*)*<slot name="end">/)
  })
})
