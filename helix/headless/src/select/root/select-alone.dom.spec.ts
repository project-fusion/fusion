import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* An option is the Option family's, and a page that writes one imports
   `@fusion.dev/helix-headless/option` beside the select. The select does not
   register it, and says so in development where it is missing. */
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

describe('a select whose options were never imported', () => {
  /* A tier of its own, with the list the select draws, so its option is one no
     other spec in the process registered. */
  test('is reported once, with the import to add', async () => {
    const { HelixHeadlessSelect } = await import('../index.js')
    const { HelixHeadlessListbox } = await import('../../listbox/index.js')
    customElements.define(
      'spec-alone-select',
      class extends HelixHeadlessSelect {
        static override tier = 'spec-alone-'
      },
    )
    customElements.define(
      'spec-alone-listbox',
      class extends HelixHeadlessListbox {
        static override tier = 'spec-alone-'
      },
    )
    const markup = `<spec-alone-select label="Size">
      <spec-alone-option value="s">Small</spec-alone-option>
      <spec-alone-option value="m">Medium</spec-alone-option>
    </spec-alone-select>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      "<spec-alone-option> in <spec-alone-select> is not registered, so it offers no choices. Import '@fusion.dev/helix-headless/option'.",
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and shows the option chosen', async () => {
    await import('../../option/index.js')
    const heard = await told(`<helix-headless-select label="Size" default-value="m">
      <helix-headless-option value="s">Small</helix-headless-option>
      <helix-headless-option value="m">Medium</helix-headless-option>
    </helix-headless-select>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement
    expect(part(host, 'value')?.textContent?.trim()).toBe('Medium')
  })
})
