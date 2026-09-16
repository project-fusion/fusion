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
})
