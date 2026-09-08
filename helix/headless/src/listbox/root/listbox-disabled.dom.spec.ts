import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

type Option = HTMLElement & { disabled: boolean; select: () => void; value: string }

const options = (host: Element): Option[] => [
  ...host.querySelectorAll<Option>('helix-headless-option'),
]

const OPTIONS = `<helix-headless-option value="rs">Rust</helix-headless-option>
  <helix-headless-option value="rb">Ruby</helix-headless-option>`

const listbox = async (attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-listbox label="Language" ${attributes}>${OPTIONS}</helix-headless-listbox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

/**
 * The signal a `<fieldset disabled>` sends, delivered by hand.
 *
 * **Driven rather than nested, because the harness does not implement it.**
 * happy-dom does not call `formDisabledCallback` for a form-associated custom
 * element inside a disabled fieldset, so a test that wrote the markup would
 * assert nothing: the element would report itself enabled and pass for the wrong
 * reason. What is ours to get right is the answer to the platform's signal, and
 * this is that signal.
 */
const formDisable = async (host: Updatable, disabled: boolean): Promise<void> => {
  ;(host as unknown as { formDisabledCallback: (value: boolean) => void }).formDisabledCallback(
    disabled,
  )
  await settle(host)
}

describe('a listbox disabled by the form around it', () => {
  test('cascades a fieldset onto its options, not only its own attribute', async () => {
    /* **The bug this exists for.** `DisabledCascadeController` read `disabled`,
       which is only what the group was given directly. A `<fieldset disabled>`
       reaches a form-associated element through `formDisabled` instead, so the
       listbox reported `disabled === false`, passed that on, and every option
       stayed selectable inside a group that was already dimmed and already
       announcing `aria-disabled`. */
    const host = await listbox()
    expect(options(host).map((option) => option.disabled)).toEqual([false, false])

    await formDisable(host, true)

    expect((host as unknown as { isDisabled: boolean }).isDisabled).toBe(true)
    expect(options(host).map((option) => option.disabled)).toEqual([true, true])
  })

  test('and a chosen option is refused while it is', async () => {
    const host = await listbox()
    await formDisable(host, true)

    const first = options(host)[0] as Option
    first.select()
    await settle(host)

    // `select` refuses on a disabled option, so nothing was ever announced.
    expect((host as unknown as { value: string }).value).toBe('')
  })

  test('and takes them back when the fieldset lets go', async () => {
    const host = await listbox()
    await formDisable(host, true)
    await formDisable(host, false)

    expect(options(host).map((option) => option.disabled)).toEqual([false, false])
  })

  test('its own attribute still cascades, which is the case that already worked', async () => {
    const host = await listbox('disabled')

    expect(options(host).map((option) => option.disabled)).toEqual([true, true])
  })
})
