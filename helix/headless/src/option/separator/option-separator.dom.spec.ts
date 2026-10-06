import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../listbox/index.js')
})

type List = Updatable & { filter: string; value: string }

const list = async (): Promise<List> => {
  const host = (await mount(`<helix-headless-listbox label="Fruit" filterable>
    <helix-headless-option value="apple">Apple</helix-headless-option>
    <helix-headless-option-separator></helix-headless-option-separator>
    <helix-headless-option value="banana">Banana</helix-headless-option>
  </helix-headless-listbox>`)) as List
  await settle(host)
  return host
}

describe('an option separator', () => {
  test('is a separator, and no stop for the keyboard', async () => {
    const host = await list()
    const rule = host.querySelector('helix-headless-option-separator') as HTMLElement
    expect(role(rule)).toBe('separator')
    expect(
      (host as unknown as { options: HTMLElement[] }).options.map((one) =>
        one.getAttribute('value'),
      ),
    ).toEqual(['apple', 'banana'])
  })

  /* A rule between two runs of which a filter left only some options
     separates nothing. */
  test('is hidden while a filter narrows the list, and back once it does not', async () => {
    const host = await list()
    const rule = host.querySelector('helix-headless-option-separator') as HTMLElement
    host.filter = 'an'
    await settle(host)
    expect(rule.hidden).toBe(true)
    host.filter = ''
    await settle(host)
    expect(rule.hidden).toBe(false)
  })
})
