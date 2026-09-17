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

const TAG = 'helix-headless-input'

describe('input server output', () => {
  test('the control ships as an input, so it works before any script', () => {
    const markup = ssr(html`<helix-headless-input label="Search"></helix-headless-input>`)
    expect(partTag(markup, 'control')).toMatch(/<input\s/)
  })

  test('the type is in the served markup, which is what picks the keyboard', () => {
    // A phone chooses its keyboard from the parsed markup. Waiting for a
    // lifecycle hook would give the first render a text keyboard for an email.
    const markup = ssr(
      html`<helix-headless-input label="Email" type="email"></helix-headless-input>`,
    )
    expect(partTag(markup, 'control')).toContain('type="email"')
  })

  test('the name and placeholder are served, not added on upgrade', () => {
    /* The name on the field rather than the one the form submits under, which is
       the host's and goes through `setFormValue`. This one is what a password
       manager and an autofill heuristic read, and they read it out of the parsed
       markup before anything upgrades. */
    const markup = partTag(
      ssr(html`<helix-headless-input name="q" placeholder="Search"></helix-headless-input>`),
      'control',
    )
    expect(markup).toContain('name="q"')
    expect(markup).toContain('placeholder="Search"')
  })

  test('a field with no name carries no empty one', () => {
    // `nothing` rather than an empty string: `name=""` is a field the form would
    // try to submit under no name at all.
    const markup = partTag(
      ssr(html`<helix-headless-input label="Search"></helix-headless-input>`),
      'control',
    )
    expect(markup).not.toContain('name=')
    expect(markup).not.toContain('placeholder=')
  })

  test('disabled, required and read-only are on the served control', () => {
    /* A form that looks fillable before it upgrades is a form that takes
       keystrokes it is going to refuse, and one served without `required` looks
       optional for as long as the script takes to arrive. */
    const markup = partTag(
      ssr(html`<helix-headless-input disabled name="q" readonly required></helix-headless-input>`),
      'control',
    )
    expect(markup).toContain('disabled')
    expect(markup).toContain('required')
    expect(markup).toContain('readonly')
  })

  test('the default value is in the field on the server', () => {
    // Seeded in `willUpdate`, which SSR calls, rather than in a hook it does
    // not: anything later would serve an empty field and fill it at hydration.
    const markup = ssr(
      html`<helix-headless-input default-value="hello" name="q"></helix-headless-input>`,
    )
    expect(partTag(markup, 'control')).toContain('value="hello"')
  })

  test('the label is served and names the control', () => {
    /* The whole point of the label being markup rather than a property read at
       upgrade. A reader on a slow connection sees a named field, and a screen
       reader announces one, which takes the `for` resolving and not merely both
       halves being present. */
    const markup = ssr(html`<helix-headless-input label="Search"></helix-headless-input>`)
    expect(partTag(markup, 'label')).toMatch(/<label\s/)
    expect(namesControl(markup)).toBe(true)
    expect(rendered(markup, TAG)).toContain('Search')
  })

  test('a hint reaches the markup and the control points at it', () => {
    const markup = ssr(
      html`<helix-headless-input label="A" hint="Help text"></helix-headless-input>`,
    )
    expect(rendered(markup, TAG)).toContain('Help text')
    expect(partTag(markup, 'control')).toContain('aria-describedby')
  })

  test('a field with nothing to describe serves no description', () => {
    // An `aria-describedby` pointing at an id that renders nothing is a field
    // whose description a screen reader cannot find.
    const markup = ssr(html`<helix-headless-input label="A"></helix-headless-input>`)
    expect(hasPart(markup, 'hint')).toBe(false)
    expect(partTag(markup, 'control')).not.toContain('aria-describedby')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-input label="Search" name="q"></helix-headless-input>`)
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'name'])
  })

  test('the constraint attributes reach the real input', () => {
    /* **The whole job of these three is to cross the shadow boundary**, and
       nothing else observes them: the component never reads `pattern` itself,
       it hands it to the platform, which anchors it at both ends and reports
       `patternMismatch`. A binding that stopped forwarding would leave a field
       that accepts anything, with no error anywhere and the property still
       reading back the value the consumer set. */
    const markup = partTag(
      ssr(
        html`<helix-headless-input
          label="Code"
          maxlength="8"
          minlength="4"
          pattern="[A-Z]+"
        ></helix-headless-input>`,
      ),
      'control',
    )
    expect(markup).toContain('pattern="[A-Z]+"')
    expect(markup).toContain('minlength="4"')
    expect(markup).toContain('maxlength="8"')
  })

  test('a field with no constraints serves none', () => {
    // `nothing` rather than an empty string. `pattern=""` matches only the empty
    // string, so a field that had merely not been given one would refuse
    // everything a reader typed.
    const markup = partTag(
      ssr(html`<helix-headless-input label="A"></helix-headless-input>`),
      'control',
    )
    expect(markup).not.toContain('pattern=')
    expect(markup).not.toContain('minlength=')
    expect(markup).not.toContain('maxlength=')
  })

  test('autocomplete is served, which is the only moment it is read', () => {
    /* A password manager and the browser's own autofill read this off the
       parsed markup, before anything upgrades, and they read it on the real
       `<input>` rather than on the custom element wrapping it. Forwarded at
       hydration it would arrive after the one pass that uses it. */
    const markup = ssr(
      html`<helix-headless-input label="Email" autocomplete="email"></helix-headless-input>`,
    )
    expect(partTag(markup, 'control')).toContain('autocomplete="email"')
  })

  test('the clear control is named, since its only content is a glyph', () => {
    /* A word the component does not already hold. `clearLabel` defaults to
       "Clear", so asserting that is an assertion a template writing the literal
       would satisfy, which is the shape this repository has found three times. */
    const markup = ssr(
      html`<helix-headless-input
        label="Search"
        clearable
        clear-label="Empty it"
        default-value="jam"
      ></helix-headless-input>`,
    )
    expect(partTag(markup, 'clear')).toContain('aria-label="Empty it"')
  })

  test('the reveal toggle is named, and says what it does rather than what it is', () => {
    // The pressed state is `aria-pressed` and the name does not move with it, so
    // a reader is told "Show password" and then told it is pressed.
    const markup = ssr(
      html`<helix-headless-input
        label="Password"
        type="password"
        reveal
        reveal-label="Reveal"
      ></helix-headless-input>`,
    )
    expect(partTag(markup, 'reveal')).toContain('aria-label="Reveal"')
    expect(partTag(markup, 'reveal')).toContain('aria-pressed="false"')
  })
})
