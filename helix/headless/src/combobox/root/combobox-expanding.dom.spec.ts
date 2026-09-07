import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The options, or nothing upgrades and the field has no words to hold.
  await import('../../option/index.js')
})

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const type = async (host: Updatable, text: string): Promise<void> => {
  const field = control(host)
  field.value = text
  field.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
  await settle(host)
}

const press = async (host: Updatable, key: string): Promise<void> => {
  control(host).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
  await settle(host)
}

/** Combobox renders its own tags, so these are counted in its shadow tree. */
const tags = (host: Updatable): number =>
  (host as HTMLElement).shadowRoot?.querySelectorAll('[part="tag"]').length ?? 0

const rest = (host: Updatable): HTMLElement | null =>
  part(host as HTMLElement, 'rest') as HTMLElement | null

/**
 * Four chosen by typing and pressing Enter, which is the only way to get tags.
 *
 * **Not `default-value`, and that is the test environment rather than the
 * component.** The field reads its words off options the slot has assigned, and
 * `slotchange` does not fire under happy-dom, so a seeded value renders no tags
 * at all — which is why the one existing assertion on rendered tags in this
 * family is a `toBe(0)`. Choosing goes through the listbox instead and does not
 * wait on the slot announcing itself.
 */
const chosen = async (extra: string): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-combobox label="L" multiple name="c" ${extra}>
    <helix-headless-option value="rs">Rust</helix-headless-option>
    <helix-headless-option value="rb">Ruby</helix-headless-option>
    <helix-headless-option value="go">Go</helix-headless-option>
    <helix-headless-option value="py">Python</helix-headless-option>
  </helix-headless-combobox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  for (const word of ['rust', 'ruby', 'go', 'python']) {
    await type(host, word)
    await press(host, 'Enter')
  }
  return host
}

describe('a combobox whose count expands', () => {
  /* The same control over a different mechanism, which is why it is tested here
     as well as on Filter Input: Combobox slices its tags and never renders the
     excess, where a filter field marks slotted ones hidden. A cap read from the
     wrong place would show everything there and nothing here. */

  test('the cap holds until it is pressed', async () => {
    const host = await chosen('expandable max-tags="2"')

    expect(tags(host)).toBe(2)
    expect(rest(host)?.textContent).toBe('+2')
  })

  test('pressing it renders the ones it was slicing away', async () => {
    const host = await chosen('expandable max-tags="2"')
    ;(rest(host) as HTMLElement).click()
    await settle(host)

    expect(tags(host)).toBe(4)
    expect(rest(host)?.getAttribute('aria-expanded')).toBe('true')
  })

  test('and puts them back', async () => {
    const host = await chosen('expandable max-tags="2"')
    ;(rest(host) as HTMLElement).click()
    await settle(host)
    ;(rest(host) as HTMLElement).click()
    await settle(host)

    expect(tags(host)).toBe(2)
    expect(rest(host)?.textContent).toBe('+2')
  })

  test('without the opt-in the count is inert, and the tab order is unchanged', async () => {
    /* The reason this is opt-in at all: Combobox's arrangement is that focus
       stays in the text while the arrows work the list, and a button between the
       tags and the caret is a change to that. */
    const host = await chosen('max-tags="2"')

    expect(rest(host)?.tagName).toBe('SPAN')
    expect((host as HTMLElement).shadowRoot?.querySelector('button[part="rest"]')).toBeNull()
  })
})
