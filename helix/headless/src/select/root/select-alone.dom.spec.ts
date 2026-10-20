import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { QUIET } from '@fusion.dev/helix-core/audits/children'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* An option is the Option family's, and a page that writes one imports
   `@fusion.dev/helix-headless/option` beside the select. The select does not
   register it, and says so in development where it is missing. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Report = { kind: string; message: string }

/**
 * What the runtime log heard while `markup` mounted and the page painted,
 * waiting for `expected` reports where a report is expected.
 */
const told = async (markup: string, expected = 0): Promise<Report[]> => {
  const key = Symbol.for('fusion.dev/helix/runtime-log')
  const log = (globalThis as Record<symbol, unknown>)[key]
  const before = Array.isArray(log) ? log.length : 0
  document.body.innerHTML = markup
  await settle(document.body.firstElementChild as Updatable)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const heard = (): Report[] => {
    const after = (globalThis as Record<symbol, unknown>)[key]
    return ((Array.isArray(after) ? after.slice(before) : []) as Report[]).filter(
      (one) => one.kind === 'unregistered-part',
    )
  }
  /* The audit reports once the page has gone quiet for `QUIET` milliseconds.
     A page still loading, as the browser spec runner's is while it fetches
     each family's chunk, goes quiet later, after up to twenty periods: a report
     that is expected is waited for until it arrives, and only its absence is
     timed. */
  const deadline = Date.now() + QUIET * 21
  await new Promise((resolve) => setTimeout(resolve, QUIET + 50))
  while (heard().length < expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return heard()
}

describe('a select whose options were never imported', () => {
  /* A tier of its own, with the list the select draws, so its option is one no
     other spec in the process registered. */
  test('is reported once, with the tag to define', async () => {
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
    expect((await told(markup, 1)).map((one) => one.message)).toEqual([
      '<spec-alone-option> in <spec-alone-select> is not registered, so it offers no choices. Define <spec-alone-option> as you defined <spec-alone-select>.',
    ])
    expect(await told(markup)).toEqual([])
    /* Up to twenty quiet periods in a page that is still loading. */
  }, 15_000)

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

/* A tier of your own registers the list the select draws, as it registers the
   select. Left out, the list is an unknown element with none of the list's
   methods: a letter on the trigger and the opening each threw calling one. */
describe('a select whose list was never registered', () => {
  test('throws nothing as you type and open it, and names the tag to define', async () => {
    const { HelixHeadlessSelect } = await import('../index.js')
    customElements.define(
      'spec-bare-sel-select',
      class extends HelixHeadlessSelect {
        static override tier = 'spec-bare-sel-'
      },
    )
    const thrown: unknown[] = []
    const hear = (event: ErrorEvent): void => {
      thrown.push(event.error ?? event.message)
    }
    window.addEventListener('error', hear)
    try {
      const heard = await told('<spec-bare-sel-select label="Size"></spec-bare-sel-select>')
      const host = document.body.firstElementChild as Updatable & { open: boolean }
      part(host as unknown as HTMLElement, 'trigger')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'm' }),
      )
      host.open = true
      await settle(host)
      expect(thrown).toEqual([])
      expect(heard.map((one) => one.message)).toEqual([
        '<spec-bare-sel-listbox> in <spec-bare-sel-select> is not registered, so its panel has no working list. Define <spec-bare-sel-listbox> as you defined <spec-bare-sel-select>.',
      ])
    } finally {
      window.removeEventListener('error', hear)
    }
  })
})
