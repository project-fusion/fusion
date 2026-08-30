import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const drawer = async (attrs: string) =>
  (await mount(
    `<helix-headless-drawer label="Settings" ${attrs}>Body</helix-headless-drawer>`,
  )) as HTMLElement & {
    modal: boolean
  }

describe('a drawer told whether to be modal', () => {
  test('is modal when nobody says otherwise', async () => {
    expect((await drawer('')).modal).toBe(true)
  })

  test('and when the attribute is there saying nothing', async () => {
    expect((await drawer('modal')).modal).toBe(true)
  })

  test('and is not when the attribute says false', async () => {
    /* The whole point. Lit's boolean converter answers `value !== null`, so
       `modal="false"` reads as true for being present: a consumer who writes
       the obvious thing gets the opposite of what they asked for, with nothing
       to say so. */
    expect((await drawer('modal="false"')).modal).toBe(false)
  })

  test('and the property still settles it either way', async () => {
    const host = await drawer('')
    host.modal = false
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(host.modal).toBe(false)
  })
})
