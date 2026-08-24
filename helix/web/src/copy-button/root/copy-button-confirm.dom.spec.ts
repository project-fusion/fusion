import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

if (hasLayout()) {
  describe('a copy button that has copied', () => {
    test('stays green under the pointer', async () => {
      /* `IconButton`'s hover is `:host(:not(:disabled)) [part="button"]:hover`,
         which is (0,4,0), against (0,2,0) for the copied rule: the hover won on
         specificity whatever the order of the sheets, so the check mark went
         back to the hover ink the moment a reader looked at it. They are still
         on the button they just pressed, which is the one moment the answer
         matters. */
      const host = await mount('<helix-copy-button value="hello"></helix-copy-button>')
      const button = part(host, 'button') as HTMLElement
      button.toggleAttribute('data-copied', true)

      const success = globalThis
        .getComputedStyle(host)
        .getPropertyValue('--helix-color-success')
        .trim()
      const resolved = globalThis.getComputedStyle(button).color

      /* Resolved rather than compared to the token text: the declaration is a
         `var()` and what matters is the color it lands on. */
      const probe = host.ownerDocument.createElement('span')
      probe.style.color = success
      host.ownerDocument.body.append(probe)
      const wanted = globalThis.getComputedStyle(probe).color
      probe.remove()

      expect(resolved).toBe(wanted)
    })
  })
}
