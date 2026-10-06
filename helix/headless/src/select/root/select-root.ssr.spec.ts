import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('select server output', () => {
  test('the trigger ships as a button, so the control is there before any script', () => {
    const trigger = partTag(
      ssr(html`<helix-headless-select label="Region"></helix-headless-select>`),
      'trigger',
    )
    expect(trigger).toMatch(/<button/)
    expect(trigger).toContain('aria-expanded="false"')
  })

  test('a select a browser can autofill ships its hidden native select', () => {
    /* Served with the page, so the field is in the form a browser parses
       before any script runs. The options arrive with the client render, a
       server not seeing the light DOM. */
    const markup = ssr(
      html`<helix-headless-select label="Country" autocomplete="country"></helix-headless-select>`,
    )
    expect(markup).toMatch(/<select[^>]*autocomplete="country"/)
    expect(markup).toMatch(/<select[^>]*aria-hidden="true"/)
    expect(ssr(html`<helix-headless-select label="Region"></helix-headless-select>`)).not.toContain(
      '<select',
    )
  })

  test('the surface ships hidden rather than not at all', () => {
    // Present and hidden, so opening it after hydration is an attribute coming
    // off rather than a subtree arriving. `Combobox` serves its own the same way.
    const markup = ssr(html`<helix-headless-select label="Region"></helix-headless-select>`)
    expect(hasPart(markup, 'surface')).toBe(true)
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  /**
   * **The placeholder is a statement, and only one of these two renders is
   * entitled to make it.**
   *
   * The words on the trigger are the chosen option's, and the options are
   * light-DOM children a server cannot see. `value` is an attribute and a
   * server has it, so a select that was told which option is chosen and served
   * "Choose" over it said the opposite of what the consumer wrote, on every
   * select in this library's own examples and on the two controls that compose
   * one, Pagination's size and Chat's model picker.
   *
   * So: the placeholder where there is genuinely no value, which is the case a
   * server is sure of, and nothing at all where there is a value whose word
   * cannot be read. The box is the same either way, and the word arrives on the
   * render after hydration.
   */
  test('the placeholder stands over no value and says nothing over a declared one', () => {
    /* Read off selects with no children, so "Choose" can only be the trigger's
       own word: a fixture carrying its options reads them back out of the host's
       light DOM, which is there whatever the shadow root holds. The server sees
       no children either way, which is the whole subject here. */
    const empty = ssr(html`<helix-headless-select label="Region"></helix-headless-select>`)
    expect(rendered(empty, 'helix-headless-select')).toContain('Choose')
    const declared = ssr(
      html`<helix-headless-select default-value="one" label="Region"></helix-headless-select>`,
    )
    expect(rendered(declared, 'helix-headless-select')).not.toContain('Choose')
    expect(hasPart(declared, 'value')).toBe(true)
  })

  test('the host writes no attributes of its own, so hydration has nothing to reconcile', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-select label="Region"></helix-headless-select>`),
        'helix-headless-select',
      ),
    ).toEqual(['label'])
  })

  test('the words for an empty and a loading list reach the list that shows them', () => {
    /* The list is a `Listbox`, a different element, so these three are not read
       here at all: they are forwarded as attributes and everything about when
       to show them belongs to the collection mixin on the other side. A binding
       that stopped forwarding leaves a select saying the library's own words
       with the property here still reading the consumer's. */
    const asking = html`<helix-headless-select
      label="Region"
      empty-text="No region by that name"
      loading-text="Asking"
      loading
    ></helix-headless-select>`
    const inner = partTag(ssr(asking), 'listbox')
    expect(inner).toContain('empty-text="No region by that name"')
    expect(inner).toContain('loading-text="Asking"')
    expect(inner).toMatch(/\sloading(?=[\s>])/)
  })

  test('and a select that is not loading forwards no loading flag', () => {
    // A flag written at its own default is a list saying it is fetching on
    // every page that renders one.
    const inner = partTag(
      ssr(html`<helix-headless-select label="Region"></helix-headless-select>`),
      'listbox',
    )
    expect(inner).not.toMatch(/\sloading(?=[\s>])/)
  })

  test('`default-open` serves the list showing and the trigger saying so', () => {
    /* The seed has to be resolved by the render the server sends: opened on the
       first client update it is a flash on every load, and for that window the
       trigger's `aria-expanded` disagrees with the screen. */
    const open = ssr(
      html`<helix-headless-select label="Region" default-open></helix-headless-select>`,
    )
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')

    const shut = ssr(html`<helix-headless-select label="Region"></helix-headless-select>`)
    expect(partTag(shut, 'trigger')).toContain('aria-expanded="false"')
  })
})
