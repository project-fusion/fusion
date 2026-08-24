import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const action = async (attributes = 'value="save"'): Promise<HTMLElement> =>
  (await mount(
    `<helix-base-speed-dial-item ${attributes}><svg slot="icon"></svg>Save</helix-base-speed-dial-item>`,
  )) as HTMLElement

/**
 * One action, and the contract that is the action's rather than the dial's.
 *
 * **The dial already proves the arrangement**, which is the fan opening, the
 * order the actions come out in and focus moving between them: it is named 20
 * times in this family's specs. What one action owns alone is that it is a real
 * disabled button rather than a dressed one, which is the opposite of the
 * neighbouring drilldown row and is a decision rather than an inconsistency: a
 * dial is a fan of controls a reader steps through, not a menu page they read
 * down.
 */
describe('one speed dial action', () => {
  test('is a real button carrying the role its dial declares', async () => {
    const item = part(await action(), 'item')
    expect(item?.tagName).toBe('BUTTON')
    expect(item?.getAttribute('type')).toBe('button')
    expect(item?.getAttribute('role')).toBe('menuitem')
  })

  /* Genuinely disabled, so the platform refuses the press rather than the
     handler doing it, and `aria-disabled` beside it so the refusal is announced
     rather than merely enacted. */
  test('is refused by the platform, and says so as well', async () => {
    const host = await action('value="save" disabled')
    const item = part(host, 'item') as HTMLButtonElement
    expect(item.hasAttribute('disabled')).toBe(true)
    expect(item.getAttribute('aria-disabled')).toBe('true')

    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    item.click()
    expect(heard).toBe(0)
  })

  test('announces what it stands for when it is chosen', async () => {
    const host = await action()
    let value: string | undefined
    host.addEventListener('helix-select', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(host, 'item') as HTMLElement).click()
    expect(value).toBe('save')
  })

  /* The mark is what a dial is read by, so both boxes are always rendered and
     the name sits beside the mark rather than replacing it. */
  test('keeps a box for the mark and a box for the name, always', async () => {
    const host = await action()
    expect(part(host, 'icon')?.querySelector('slot')?.getAttribute('name')).toBe('icon')
    expect(part(host, 'label')?.querySelector('slot')?.hasAttribute('name')).toBe(false)
  })
})
