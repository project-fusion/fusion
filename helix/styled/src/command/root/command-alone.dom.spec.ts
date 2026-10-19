import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Only the palette is imported here, the way a page that asks for nothing
   else imports it. It registers what it draws, its dialog and its list. The
   commands are options, which the page writes and imports from
   `@fusion.dev/helix/option`, so they are not the palette's to register. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('a palette imported alone', () => {
  test('defines the dialog and the list it draws', () => {
    expect(customElements.get('helix-dialog')).toBeDefined()
    expect(customElements.get('helix-listbox')).toBeDefined()
  })
})
