import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Dialog = HTMLElement & { material?: string }

describe('command material', () => {
  test('hands its material to the dialog it opens in', async () => {
    const host = await mount('<helix-command label="Commands" material="frosted"></helix-command>')
    const dialog = host.shadowRoot?.querySelector('helix-dialog') as Dialog | null
    expect(dialog?.material).toBe('frosted')
  })

  test('leaves the dialog on its opaque surface where it has none', async () => {
    const host = await mount('<helix-command label="Commands"></helix-command>')
    const dialog = host.shadowRoot?.querySelector('helix-dialog') as Dialog | null
    expect(dialog?.material).toBeUndefined()
  })

  test('follows a change', async () => {
    const host = (await mount(
      '<helix-command label="Commands"></helix-command>',
    )) as HTMLElement & {
      material?: string
      updateComplete: Promise<boolean>
    }
    host.material = 'glass'
    await host.updateComplete
    const dialog = host.shadowRoot?.querySelector('helix-dialog') as Dialog | null
    expect(dialog?.material).toBe('glass')
  })
})
