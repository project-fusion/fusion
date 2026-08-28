import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Toggle = HTMLElement & {
  focusable: boolean
  selected: boolean
  focusItem(): void
  select(): void
  updateComplete: Promise<boolean>
}

const toggle = async (attributes = 'value="a"'): Promise<Toggle> =>
  (await mount(`<helix-headless-toggle ${attributes}>Grid</helix-headless-toggle>`)) as Toggle

/**
 * One toggle, and the contract that is the toggle's rather than the group's.
 *
 * **The group already proves the coordination**, which is one selection at a
 * time, arrow keys moving between members and the value the group reports to a
 * form. What is left is what one option owns, and this is the last part in the
 * library that had a server spec and no DOM spec: the inverse of the fifteen
 * around it, where the *group* was covered and the member was not.
 */
describe('one toggle', () => {
  /* `aria-checked` is written in both states rather than omitted when false,
     which is the opposite of `aria-current` on a playlist entry and is correct
     here for the reason the roles differ: an unchecked radio is one of the
     answers, and a reader is told how many there are and which is chosen. */
  test('says it is unchecked as well as checked, because both are answers', async () => {
    expect(part(await toggle(), 'item')?.getAttribute('aria-checked')).toBe('false')
    expect(part(await toggle('value="a" selected'), 'item')?.getAttribute('aria-checked')).toBe(
      'true',
    )
  })

  /* A real `disabled` button, so the platform refuses the press, and `select()`
     refuses too: the group calls that from its own key handling and never sees
     the button. */
  test('refuses from the platform and from the method the group calls', async () => {
    const host = await toggle('value="a" disabled')
    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })

    expect((part(host, 'item') as HTMLButtonElement).disabled).toBe(true)
    ;(part(host, 'item') as HTMLElement).click()
    host.select()
    expect(heard).toBe(0)
  })

  /* The tab stop normally rides on the selection, so an unanswered group had no
     stop at all and the keyboard could not reach it. `focusable` is the group
     lending it to the first member, and it is a property with no attribute
     because `tabindex` written onto a host a React consumer rendered is exactly
     the change hydration reports and does not patch up. */
  test('holds a tab stop when it is chosen, or when the group lends it one', async () => {
    const host = await toggle()
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('-1')

    host.focusable = true
    await host.updateComplete
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('0')

    expect(part(await toggle('value="a" selected'), 'item')?.getAttribute('tabindex')).toBe('0')
    expect(host.hasAttribute('tabindex')).toBe(false)
    expect(host.hasAttribute('focusable')).toBe(false)
  })

  /* The group drives the arrows and cannot reach the control, which is inside
     this shadow root, so the intent is a method rather than the group reaching
     through a part selector into a child's internals. */
  test('takes focus onto its own control when the group asks it to', async () => {
    const host = await toggle()
    host.focusItem()
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'item'))
  })

  test('announces what it stands for when it is chosen', async () => {
    const host = await toggle()
    let value: string | undefined
    host.addEventListener('helix-select', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(host, 'item') as HTMLElement).click()
    expect(value).toBe('a')
  })
})
