import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('combobox server output', () => {
  test('the field refuses autofill by name, on the control the browser looks at', () => {
    /* A combobox is a text field to the browser, so autofill offers it street
       addresses and email addresses unless told not to. The token is read off
       the real `<input>` in the parsed markup, which is before this element
       upgrades, so forwarding it later is forwarding it after the one pass that
       reads it. Set to a value the property does not default to, since `off` is
       written in the class and asserting that would pass against a literal. */
    const markup = partTag(
      ssr(
        html`<helix-headless-combobox
          label="City"
          autocomplete="address-level2"
          allows-custom-value
        ></helix-headless-combobox>`,
      ),
      'control',
    )
    expect(markup).toContain('autocomplete="address-level2"')
  })

  test('a combobox answered by its options ships the hidden select a browser fills', () => {
    /* The text field is the filter, so it stays off, and the token goes on a
       hidden native select served with the page, before any script runs. */
    const markup = rendered(
      ssr(
        html`<helix-headless-combobox label="Country" autocomplete="country"></helix-headless-combobox>`,
      ),
      'helix-headless-combobox',
    )
    expect(partTag(markup, 'control')).toContain('autocomplete="off"')
    expect(markup).toMatch(/<select[^>]*autocomplete="country"/)
  })

  test('the list is named and told what to say, through the element that says it', () => {
    /* The list is a `Listbox`, so the three words a combobox holds have to
       reach it as attributes rather than being rendered here: a name for the
       popup, and the two strings the collection shows in place of rows. Each is
       forwarded and read nowhere else, so a binding that stopped would leave an
       unnamed popup and a list saying the library's own words. */
    const inner = partTag(
      ssr(
        html`<helix-headless-combobox
          label="City"
          list-label="Cities"
          empty-text="No city by that name"
          loading-text="Asking"
          loading
        ></helix-headless-combobox>`,
      ),
      'listbox',
    )
    expect(inner).toContain('aria-label="Cities"')
    expect(inner).toContain('empty-text="No city by that name"')
    expect(inner).toContain('loading-text="Asking"')
    expect(inner).toMatch(/\sloading(?=[\s>])/)
  })

  test('and a combobox that is not loading forwards no loading flag', () => {
    const inner = partTag(
      ssr(html`<helix-headless-combobox label="City"></helix-headless-combobox>`),
      'listbox',
    )
    expect(inner).not.toMatch(/\sloading(?=[\s>])/)
  })

  test('`default-open` serves the surface showing and the field saying so', () => {
    /* Served shut and opened on the first update is a flash on every load, and
       for that window `aria-expanded` disagrees with what is on the screen. */
    const open = ssr(
      html`<helix-headless-combobox label="City" default-open></helix-headless-combobox>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)
    expect(partTag(open, 'control')).toContain('aria-expanded="true"')

    const shut = ssr(html`<helix-headless-combobox label="City"></helix-headless-combobox>`)
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
    expect(partTag(shut, 'control')).toContain('aria-expanded="false"')
  })
})
