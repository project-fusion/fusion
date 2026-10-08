import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A suggestion is an option, the Option family's, and a page that writes one
   imports `@fusion.dev/helix-headless/option` beside the field. The field does
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

describe('a filter field whose suggestions were never imported', () => {
  /* A tier of its own, so its option is one no other spec in the process
     registered. Measured before this: the suggestions were inert, the field
     had no combobox role, and nothing was said. */
  test('is reported once, with the import to add', async () => {
    const { HelixHeadlessFilterInput } = await import('../index.js')
    customElements.define(
      'spec-sugg-filter-input',
      class extends HelixHeadlessFilterInput {
        static override tier = 'spec-sugg-'
      },
    )
    const markup = `<spec-sugg-filter-input label="Filter">
      <spec-sugg-option slot="suggestions" value="status:">status:</spec-sugg-option>
    </spec-sugg-filter-input>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      "<spec-sugg-option> in <spec-sugg-filter-input> is not registered, so the field suggests nothing. Import '@fusion.dev/helix-headless/option'.",
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and offers them', async () => {
    await import('../../option/index.js')
    const heard = await told(`<helix-headless-filter-input label="Filter">
      <helix-headless-option slot="suggestions" value="status:">status:</helix-headless-option>
    </helix-headless-filter-input>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement
    expect(part(host, 'control')?.getAttribute('role')).toBe('combobox')
  })
})
