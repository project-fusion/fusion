import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('checkbox server output', () => {
  test('the control ships as a real input, so the box is there before any script', () => {
    const markup = ssr(html`<helix-checkbox label="Terms"></helix-checkbox>`)
    expect(partTag(markup, 'control')).toContain('type="checkbox"')
    expect(rendered(markup, 'helix-checkbox')).toContain('Terms')
  })

  /**
   * **The half a server can get wrong, asserted on the tier a consumer ships.**
   *
   * `checked` is a boolean attribute and is true wherever it is present, so an
   * unticked box is the absence of it and nothing else. A property binding is
   * what Lit SSR stringifies, and `checked="false"` was an unticked box served
   * as ticked: `:checked` matched it and a screen reader was told so, on every
   * checkbox in this tier's own examples.
   *
   * Both polarities, because only the unticked one can fail. The styled tier
   * inherits the template, which is exactly why this is worth asking here: the
   * fault reached a consumer through this element.
   */
  test('the server says checked on a ticked box and says nothing on an unticked one', () => {
    const ticked = ssr(html`<helix-checkbox default-checked label="Terms"></helix-checkbox>`)
    expect(partTag(ticked, 'control')).toContain('checked')
    const unticked = ssr(html`<helix-checkbox label="Terms"></helix-checkbox>`)
    expect(partTag(unticked, 'control')).not.toContain('checked')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(ssr(html`<helix-checkbox name="terms"></helix-checkbox>`), 'helix-checkbox'),
    ).toEqual(['name'])
  })

  /**
   * **An empty checkbox reads as an empty mark.** Its edge is the mark ink. In
   * the rule ink, a divider's 1.1:1, the edge vanished around the hole the box
   * punches through to the page, so in a card in dark mode an unchosen checkbox
   * drew as a solid dark shape.
   */
  test('at rest it is an empty outline in the mark ink', () => {
    const sheet = readFileSync(new URL('./checkbox-root.generated.css', import.meta.url), 'utf8')
    const rule = sheet.slice(sheet.indexOf('[part="control"] {'))
    const resting = rule.slice(0, rule.indexOf('}'))
    expect(resting).toContain('--helix-color-foreground-subtle')
    expect(resting).not.toContain('--helix-color-border)')
    expect(resting).toContain('transparent)')
  })
})
