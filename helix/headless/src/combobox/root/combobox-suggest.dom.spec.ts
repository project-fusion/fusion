import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Combobox = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

const combobox = async (attrs = 'suggest'): Promise<Combobox> => {
  const host = (await mount(
    `<helix-base-combobox label="Language" ${attrs}>
      <helix-base-option value="rb">Ruby</helix-base-option>
      <helix-base-option value="rs">Rust</helix-base-option>
      <helix-base-option value="ts">TypeScript</helix-base-option>
    </helix-base-combobox>`,
  )) as Combobox
  await host.updateComplete
  return host
}

const control = (host: Combobox): HTMLInputElement => part(host, 'control') as HTMLInputElement

/* Typing, as the browser does it: whatever is selected is replaced by the
   character, which is what makes the second keystroke different from the first. */
const type = async (host: Combobox, character: string): Promise<void> => {
  const input = control(host)
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length
  input.value = input.value.slice(0, start) + character + input.value.slice(end)
  input.setSelectionRange(start + 1, start + 1)
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: character,
      inputType: 'insertText',
    }),
  )
  await host.updateComplete
}

if (hasLayout()) {
  describe('a combobox that finishes the word', () => {
    test('keeps finishing it past the first character', async () => {
      /* Lit dirty-checks a property binding against the value it last wrote,
         not against the DOM, and typing changes the DOM underneath it. Type `r`
         and the field is written `Ruby` with `uby` selected; type `u` and the
         field is already `Ru`, while the completion is still `Ruby`. Unchanged,
         so nothing was written and nothing was selected, and the completion
         appeared on the first character and never again. */
      const host = await combobox()
      await type(host, 'r')
      expect(control(host).value).toBe('Ruby')

      await type(host, 'u')
      expect(control(host).value).toBe('Ruby')
      expect(control(host).selectionStart).toBe(2)

      await type(host, 'b')
      expect(control(host).value).toBe('Ruby')
      expect(control(host).selectionStart).toBe(3)
    })

    test('and only ever forwards, so deleting does not put it back', async () => {
      const host = await combobox()
      await type(host, 'r')
      expect(control(host).value).toBe('Ruby')

      const input = control(host)
      input.value = 'Rub'
      input.setSelectionRange(3, 3)
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          inputType: 'deleteContentBackward',
        }),
      )
      await host.updateComplete
      expect(control(host).value).toBe('Rub')
    })

    test('does nothing at all without `suggest`', async () => {
      const host = await combobox('')
      await type(host, 'r')
      expect(control(host).value).toBe('r')
    })
  })
}
