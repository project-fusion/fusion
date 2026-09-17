import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The row of tokens, and the count at the end of it.
 *
 * **One spec beside the mixin rather than one in each of the four hosts.** What
 * `expandable`, `expandLabel` and `collapseLabel` do is decided here and
 * nowhere else: Combobox, Filter Input, Date Input and Time Input hand this
 * their tokens and draw whatever `renderTokenRow` gives back, so four copies of
 * these assertions would be four readings of the same template and would drift
 * apart without any of them failing. What is genuinely per host is where the
 * tokens come from, which each host's own spec covers.
 *
 * **The count is two different elements and the part name is one**, which is
 * the fact worth holding: a consumer's `::part(rest)` has to keep working
 * across the change, and the element under it has to be a real button rather
 * than a `<span>` with a click handler, or the affordance is one only a pointer
 * can reach.
 */
type Row = HTMLElement & {
  collapseLabel: string
  expandable: boolean
  expandLabel: string
  maxTags: number
  updateComplete: Promise<boolean>
}

const tag = 'probe-tokens'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinTokens } = await import('./mixin-tokens.js')
  const { html } = await import('lit')
  customElements.define(
    tag,
    class extends MixinTokens(HelixElement) {
      /* Three tokens and a cap of one, so there are always two over: the count
         is what these properties are about and the tokens themselves are the
         host's business. */
      protected override render() {
        const shown = this.shownLimit > 0 ? this.shownLimit : 3
        return this.renderTokenRow(
          html`${[...Array(shown).keys()].map((at) => html`<span part="tag">${at}</span>`)}`,
          3 - shown,
        )
      }
    },
  )
})

const row = async (attrs = 'max-tags="1"'): Promise<Row> => {
  document.body.innerHTML = `<${tag} ${attrs}></${tag}>`
  const host = document.body.firstElementChild as Row
  await host.updateComplete
  return host
}

const rest = (host: Row): HTMLElement | null =>
  (host.shadowRoot?.querySelector('[part="rest"]') as HTMLElement | null) ?? null

describe('a row of tokens that only counts the rest', () => {
  test('the count is text, with no tab stop and nothing to press', async () => {
    /* `expandable` is off by default and that is about focus rather than
       caution: the control is a new stop in the tab order between the tokens
       and whatever follows them, which for a combobox is a change to its whole
       keyboard model. */
    const host = await row()
    expect(rest(host)?.tagName).toBe('SPAN')
    expect(rest(host)?.textContent).toBe('+2')
    expect(rest(host)?.hasAttribute('aria-label')).toBe(false)
  })

  test('and nothing at all where every token fits', async () => {
    const host = await row('')
    expect(rest(host)).toBeNull()
  })
})

describe('a row whose count opens', () => {
  test('the count is a real button, named by `expandLabel`', async () => {
    /* `+3` is a number in every language and says nothing about what pressing
       it does, so the phrase is the accessible name rather than the content.
       A phrase the mixin does not default to, since `expandLabel` holds "Show
       all" and asserting that would pass against a template writing it. */
    const host = await row('max-tags="1" expandable expand-label="See them all"')
    expect(rest(host)?.tagName).toBe('BUTTON')
    expect(rest(host)?.textContent?.trim()).toBe('+2')
    expect(rest(host)?.getAttribute('aria-label')).toBe('See them all')
    expect(rest(host)?.getAttribute('aria-expanded')).toBe('false')
  })

  test('pressing it shows the rest and the name becomes `collapseLabel`', async () => {
    /* The words go and a caret takes their place: expanded there is no number
       left to show, and a phrase in its place would change the control's width
       as it was pressed, moving the row of tokens beside it. The phrase is
       still the name, so what a reader hears is still a sentence.

       Both are words the mixin does not default to. */
    const host = await row(
      'max-tags="1" expandable collapse-label="Fold them back" expand-label="See them all"',
    )
    rest(host)?.click()
    await host.updateComplete

    expect(rest(host)?.getAttribute('aria-label')).toBe('Fold them back')
    expect(rest(host)?.getAttribute('aria-expanded')).toBe('true')
    expect(rest(host)?.textContent?.trim()).not.toContain('+')
  })

  test('and the way back is there even though no token is over the cap any more', async () => {
    /* The cap is off while expanded, so the count is zero and a control gated
       on the number would take away the only way back. */
    const host = await row('max-tags="1" expandable')
    rest(host)?.click()
    await host.updateComplete
    expect(rest(host)).not.toBeNull()
  })

  test('the part name is the same either way, so a consumer’s rule survives the change', async () => {
    const text = await row()
    const control = await row('max-tags="1" expandable')
    expect(rest(text)?.getAttribute('part')).toBe('rest')
    expect(rest(control)?.getAttribute('part')).toBe('rest')
  })
})
