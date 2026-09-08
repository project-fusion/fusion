import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const toggles = (host: Element): (HTMLElement & { disabled: boolean })[] => [
  ...host.querySelectorAll<HTMLElement & { disabled: boolean }>('helix-headless-toggle'),
]

const group = async (attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-toggle-group ${attributes}>
    <helix-headless-toggle value="a">A</helix-headless-toggle>
    <helix-headless-toggle value="b">B</helix-headless-toggle>
  </helix-headless-toggle-group>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

describe('a toggle group that is not form-associated', () => {
  test('cascades its own disabled, which is all it has to cascade', async () => {
    /* The reason `DisabledCascadeController` falls back rather than requiring
       `isDisabled`: this group is a plain element, so there is no `formDisabled`
       to or in and nothing for a fieldset to reach it with. Reading only the
       form-associated answer would have disabled nothing here. */
    const host = await group('disabled')

    expect(toggles(host).map((toggle) => toggle.disabled)).toEqual([true, true])
  })

  test('and leaves them alone when it is not', async () => {
    const host = await group()

    expect(toggles(host).map((toggle) => toggle.disabled)).toEqual([false, false])
  })
})
