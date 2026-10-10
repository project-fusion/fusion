import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* An option is the Option family's, and a page that writes one imports
   `@fusion.dev/helix-headless/option` beside the combobox. The combobox does
   not register it, and says so in development where it is missing. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Report = { kind: string; message: string }

/** What the runtime log heard while `markup` mounted and the page painted. */
const told = async (markup: string): Promise<Report[]> => {
  const key = Symbol.for('fusion.dev/helix/runtime-log')
  const log = (globalThis as Record<symbol, unknown>)[key]
  const before = Array.isArray(log) ? log.length : 0
  document.body.innerHTML = markup
  await settle(document.body.firstElementChild as Updatable)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const after = (globalThis as Record<symbol, unknown>)[key]
  return ((Array.isArray(after) ? after.slice(before) : []) as Report[]).filter(
    (one) => one.kind === 'unregistered-part',
  )
}

describe('a combobox whose options were never imported', () => {
  /* A tier of its own, with the list the combobox draws, so its option is one no other spec in the
     process registered. */
  test('is reported once, with the tag to define', async () => {
    const { HelixHeadlessCombobox } = await import('../index.js')
    customElements.define(
      'spec-combo-combobox',
      class extends HelixHeadlessCombobox {
        static override tier = 'spec-combo-'
      },
    )
    const { HelixHeadlessListbox } = await import('../../listbox/index.js')
    customElements.define(
      'spec-combo-listbox',
      class extends HelixHeadlessListbox {
        static override tier = 'spec-combo-'
      },
    )
    const markup = `<spec-combo-combobox label="City">
      <spec-combo-option value="ber">Berlin</spec-combo-option>
    </spec-combo-combobox>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      '<spec-combo-option> in <spec-combo-combobox> is not registered, so it suggests nothing. Define <spec-combo-option> as you defined <spec-combo-combobox>.',
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and shows the option chosen', async () => {
    await import('../../option/index.js')
    const heard = await told(`<helix-headless-combobox label="City" default-value="par">
      <helix-headless-option value="ber">Berlin</helix-headless-option>
      <helix-headless-option value="par">Paris</helix-headless-option>
    </helix-headless-combobox>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement
    expect((part(host, 'control') as HTMLInputElement).value).toBe('Paris')
  })
})

/* A tier of your own registers the list the combobox draws, as it registers
   the combobox. Left out, the list is an unknown element with none of the
   list's methods: each keystroke threw calling one, and the report named an
   import of ours, which cannot register a tag of yours. */
describe('a combobox whose list was never registered', () => {
  test('throws nothing as you type, and names the tag to define', async () => {
    const { HelixHeadlessCombobox } = await import('../index.js')
    customElements.define(
      'spec-bare-combobox',
      class extends HelixHeadlessCombobox {
        static override tier = 'spec-bare-'
      },
    )
    const thrown: unknown[] = []
    const hear = (event: ErrorEvent): void => {
      thrown.push(event.error ?? event.message)
    }
    window.addEventListener('error', hear)
    try {
      const heard = await told('<spec-bare-combobox label="City"></spec-bare-combobox>')
      const host = document.body.firstElementChild as HTMLElement
      const control = part(host, 'control') as HTMLInputElement
      for (const typed of ['b', 'be']) {
        control.value = typed
        control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        await settle(host as Updatable)
      }
      expect(thrown).toEqual([])
      expect(heard.map((one) => one.message)).toEqual([
        '<spec-bare-listbox> in <spec-bare-combobox> is not registered, so its panel has no working list. Define <spec-bare-listbox> as you defined <spec-bare-combobox>.',
      ])
    } finally {
      window.removeEventListener('error', hear)
    }
  })
})
