import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

if (hasLayout()) {
  describe('a command palette', () => {
    const palette = async (attrs = ''): Promise<HTMLElement> =>
      mount(
        `<helix-command open label="Commands" ${attrs}>
          <helix-option value="a">Open file</helix-option>
          <helix-option value="b">Save all</helix-option>
        </helix-command>`,
      )

    const inset = (host: HTMLElement): string =>
      globalThis
        .getComputedStyle(host.querySelector('helix-option') as Element)
        .getPropertyValue('--option-block-inset')
        .trim()

    test('gives its rows room, because a palette is scanned rather than filled in', async () => {
      /* Option sizes itself for a select's dropdown, where a row is one of a few
         and the list is short. A palette is a page of them read at speed. */
      const host = await palette()
      expect(inset(host)).not.toBe('')
    })

    test('set through the hook, not reached for through a part', async () => {
      /* The rows are `helix-option` elements in the palette's own light DOM,
         slotted onward into the listbox. They are parts of nothing here, so
         `::part(option)` matched nothing at all and the rows kept the select's
         inset. A custom property inherits down the tree and into each row's
         shadow root, which is the one thing that reaches them. */
      const dense = await palette('data-density="sm"')
      const roomy = await palette('data-density="lg"')
      expect(inset(dense)).not.toBe(inset(roomy))
    })
  })
}
