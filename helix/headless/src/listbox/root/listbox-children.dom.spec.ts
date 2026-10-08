import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* An option is the Option family's, and a page that writes one imports
   `@fusion.dev/helix-headless/option` beside the list. The list does not
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

describe('a listbox whose options were never imported', () => {
  /* A tier of its own, so its option is one no other spec in the
     process registered. */
  test('is reported once, with the import to add', async () => {
    const { HelixHeadlessListbox } = await import('../index.js')
    customElements.define(
      'spec-list-listbox',
      class extends HelixHeadlessListbox {
        static override tier = 'spec-list-'
      },
    )
    const markup = `<spec-list-listbox label="Fruit">
      <spec-list-option value="a">Apple</spec-list-option>
    </spec-list-listbox>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      "<spec-list-option> in <spec-list-listbox> is not registered, so the list offers no choices. Import '@fusion.dev/helix-headless/option'.",
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and reads them', async () => {
    await import('../../option/index.js')
    const heard = await told(`<helix-headless-listbox label="Fruit">
      <helix-headless-option value="a">Apple</helix-headless-option>
      <helix-headless-option value="b">Banana</helix-headless-option>
    </helix-headless-listbox>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement & { options: unknown[] }
    expect(host.options).toHaveLength(2)
  })
})

/* The options `items` draws are drawn in the list's own shadow root, where the
   page never writes one, so the list registers them itself, and only then. */
describe('a listbox drawing `items`', () => {
  test('registers the option it draws, and a list of children does not ask', async () => {
    const { HelixHeadlessListbox } = await import('../index.js')
    const { HelixHeadlessOption } = await import('../../option/index.js')
    let asked = 0
    customElements.define(
      'spec-items-listbox',
      class extends HelixHeadlessListbox {
        static override tier = 'spec-items-'
        protected override defineOption(): Promise<unknown> {
          asked += 1
          customElements.define('spec-items-option', class extends HelixHeadlessOption {})
          return Promise.resolve()
        }
      },
    )
    await told(
      '<spec-items-listbox label="Fruit"><spec-items-option value="a">Apple</spec-items-option></spec-items-listbox>',
    )
    expect(asked).toBe(0)
    document.body.innerHTML = '<spec-items-listbox label="Fruit"></spec-items-listbox>'
    const list = document.body.firstElementChild as Updatable & { items: unknown[] }
    list.items = ['Apple', 'Banana']
    await settle(list)
    expect(asked).toBe(1)
    expect(customElements.get('spec-items-option')).toBeDefined()
    list.items = ['Cherry']
    await settle(list)
    expect(asked).toBe(1)
  })
})
