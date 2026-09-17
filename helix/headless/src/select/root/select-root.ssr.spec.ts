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
})
