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
  test('is reported once, with the import to add', async () => {
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
      "<spec-combo-option> in <spec-combo-combobox> is not registered, so it suggests nothing. Import '@fusion.dev/helix-headless/option'.",
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
