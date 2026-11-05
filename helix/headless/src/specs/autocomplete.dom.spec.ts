import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* What a browser may offer in each text box a component draws in its shadow
   root. Every one takes `autocomplete` and hands it to the box. Where form
   history never helps, the default is `off`: a date field offered unrelated
   words a reader had typed elsewhere. Where it can, the default is the
   browser's own, and the attribute is left off. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Each text-entry component, what its box says by default, and whether a token lands on that box. */
const FIELDS: { attributes?: string; tag: string; unset: string | null }[] = [
  { tag: 'input', unset: null },
  { tag: 'textarea', unset: null },
  { tag: 'number-input', unset: 'off' },
  { tag: 'date-input', unset: 'off' },
  { tag: 'time-input', unset: 'off' },
  { tag: 'filter-input', unset: 'off' },
  { attributes: 'allows-custom-value', tag: 'combobox', unset: 'off' },
  { tag: 'color-input', unset: 'off' },
  { tag: 'pin-input', unset: 'one-time-code' },
]

const field = async (tag: string, attributes = ''): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-headless-${tag} label="Field" ${attributes}></helix-headless-${tag}>`,
  )) as HTMLElement & Updatable
  await settle(host)
  return host
}

/** The box a reader types into, which carries the attribute. */
const box = (host: HTMLElement): Element =>
  host.shadowRoot?.querySelector(
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea',
  ) as Element

describe('autocomplete', () => {
  for (const { attributes = '', tag, unset } of FIELDS) {
    test(`${tag} hands its default to the box it draws`, async () => {
      expect(box(await field(tag, attributes)).getAttribute('autocomplete')).toBe(unset)
    })

    test(`${tag} hands a token to the box`, async () => {
      expect(
        box(await field(tag, `${attributes} autocomplete="email"`)).getAttribute('autocomplete'),
      ).toBe('email')
    })

    test(`${tag} leaves the attribute off when it is set empty`, async () => {
      const host = (await field(tag, attributes)) as HTMLElement &
        Updatable & { autocomplete: string }
      host.autocomplete = ''
      await settle(host)
      expect(box(host).hasAttribute('autocomplete')).toBe(false)
    })
  }

  /* A combobox that only takes its options is filled by choosing one, so a
     token goes to a hidden native select the browser fills, and the text box
     stays `off`. */
  test('a combobox of options only hands a token to the select it fills', async () => {
    const host = await field('combobox', 'autocomplete="country"')
    expect(box(host).getAttribute('autocomplete')).toBe('off')
    expect(host.shadowRoot?.querySelector('select')?.getAttribute('autocomplete')).toBe('country')
  })

  /* A segmented date field draws no text box for the browser to fill, so a
     hidden native date input carries the token. */
  test('a segmented date field hands a token to the native input it fills', async () => {
    const host = await field('date-input', 'segmented autocomplete="bday"')
    expect(host.shadowRoot?.querySelector('input[type="date"]')?.getAttribute('autocomplete')).toBe(
      'bday',
    )
  })
})
