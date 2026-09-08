import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/listbox')
  await import('@fusion.dev/helix-headless/option')
  await import('@fusion.dev/helix-headless/toggle')
})

type Option = HTMLElement & { disabled: boolean; value: string }

const options = (host: Element): Option[] => [
  ...host.querySelectorAll<Option>('helix-headless-option'),
]

const listbox = async (markup: string): Promise<Updatable> => {
  document.body.innerHTML = markup
  const host = document.body.querySelector('helix-headless-listbox') as Updatable
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

const OPTIONS = `<helix-headless-option value="rs">Rust</helix-headless-option>
  <helix-headless-option value="rb">Ruby</helix-headless-option>`

describe('a group disabled by the form around it', () => {
  test('cascades a fieldset onto its members, not only its own attribute', async () => {
    /* **The bug this exists for.** The cascade read `disabled`, which is only
       what the group was given directly. A `<fieldset disabled>` reaches a
       form-associated element through `formDisabled` instead, so the listbox
       reported `disabled === false`, passed that on, and every option stayed
       selectable inside a group that was already dimmed. */
    const host = await listbox(
      `<helix-headless-listbox label="Language">${OPTIONS}</helix-headless-listbox>`,
    )
    expect(options(host).map((option) => option.disabled)).toEqual([false, false])

    await formDisable(host, true)

    expect((host as unknown as { isDisabled: boolean }).isDisabled).toBe(true)
    expect(options(host).map((option) => option.disabled)).toEqual([true, true])
  })

  test('and a chosen option is refused while it is', async () => {
    const host = await listbox(
      `<helix-headless-listbox label="Language">${OPTIONS}</helix-headless-listbox>`,
    )
    await formDisable(host, true)
    const first = options(host)[0] as Option & { select: () => void }

    first.select()
    await settle(host)

    // `select` refuses on a disabled option, so nothing was ever announced.
    expect((host as unknown as { value: string }).value).toBe('')
  })

  test('its own attribute still cascades, which is the case that already worked', async () => {
    const host = await listbox(
      `<helix-headless-listbox disabled label="Language">${OPTIONS}</helix-headless-listbox>`,
    )

    expect(options(host).map((option) => option.disabled)).toEqual([true, true])
  })

  test('and an enabled group leaves its members alone', async () => {
    const host = await listbox(
      `<helix-headless-listbox label="Language">${OPTIONS}</helix-headless-listbox>`,
    )

    expect(options(host).map((option) => option.disabled)).toEqual([false, false])
  })

  test('a group with no form reading falls back to its own', async () => {
    /* Toggle Group is not form-associated: it has `disabled` and nothing to
       inherit, so the fallback is what it uses and must keep working. */
    document.body.innerHTML = `<helix-headless-toggle-group disabled>
      <helix-headless-toggle value="a">A</helix-headless-toggle>
      <helix-headless-toggle value="b">B</helix-headless-toggle>
    </helix-headless-toggle-group>`
    const group = document.body.firstElementChild as Updatable
    await settle(group)

    const toggles = [
      ...(group as HTMLElement).querySelectorAll<HTMLElement & { disabled: boolean }>(
        'helix-headless-toggle',
      ),
    ]
    expect(toggles.map((toggle) => toggle.disabled)).toEqual([true, true])
  })
})
