import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A command is an option, the Option family's, and a page that writes one
   imports `@fusion.dev/helix-headless/option` beside the palette. The palette
   does not register it, and says so in development where it is missing. */
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

describe('a palette whose commands were never imported', () => {
  /* A tier of its own, with the dialog and the list the palette draws, so its
     option is one no other spec in the process registered. */
  test('is reported once, with the import to add', async () => {
    const { HelixHeadlessCommand } = await import('../index.js')
    const { HelixHeadlessDialog } = await import('../../dialog/index.js')
    const { HelixHeadlessListbox } = await import('../../listbox/index.js')
    for (const [tag, base] of [
      ['spec-cmd-command', HelixHeadlessCommand],
      ['spec-cmd-dialog', HelixHeadlessDialog],
      ['spec-cmd-listbox', HelixHeadlessListbox],
    ] as const) {
      customElements.define(
        tag,
        class extends (base as unknown as typeof HelixHeadlessListbox) {
          static override tier = 'spec-cmd-'
        },
      )
    }
    const markup = `<spec-cmd-command inline>
      <spec-cmd-option value="new">New file</spec-cmd-option>
    </spec-cmd-command>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      "<spec-cmd-option> in <spec-cmd-command> is not registered, so the palette lists no commands. Import '@fusion.dev/helix-headless/option'.",
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and lists them', async () => {
    await import('../../option/index.js')
    const heard = await told(`<helix-headless-command inline>
      <helix-headless-option value="new">New file</helix-headless-option>
      <helix-headless-option value="open">Open file</helix-headless-option>
    </helix-headless-command>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement
    const list = part(host, 'listbox') as HTMLElement & { options: unknown[] }
    expect(list.options).toHaveLength(2)
  })
})
