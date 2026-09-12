import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* A diff is content like any other: slotted text, read once the slot has been
   assigned, which is why every mount here waits twice. */

const PATCH = `--- a/a.ts
+++ b/a.ts
@@ -8,3 +8,3 @@
 keep
-old
+new
 end
`

type Block = Updatable & { variant?: string }

const block = async (attrs = 'diff', content = PATCH): Promise<Block> => {
  const host = (await mount(
    `<helix-headless-code-block ${attrs}>${content}</helix-headless-code-block>`,
  )) as Block
  await host.updateComplete
  await host.updateComplete
  return host
}

const parts = (host: HTMLElement, name: string): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>(`[part="${name}"]`) ?? []),
]

describe('a code block reading a diff', () => {
  test('marks an added line as an insertion and a removed one as a deletion', async () => {
    const host = await block()
    expect(parts(host, 'added').map((line) => line.localName)).toEqual(['ins'])
    expect(parts(host, 'removed').map((line) => line.localName)).toEqual(['del'])
    expect(parts(host, 'context')).toHaveLength(2)
  })

  test('says what happened in text as well, so it is not carried by color', async () => {
    const host = await block()
    expect(parts(host, 'marker').map((marker) => marker.textContent)).toEqual([' ', '-', '+', ' '])
  })

  test('numbers lines as the file does, and keeps the numbers from being read aloud', async () => {
    const host = await block()
    const numbers = parts(host, 'number')
    expect(numbers.every((number) => number.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(numbers.slice(0, 2).map((number) => number.textContent?.trim())).toEqual(['8', '8'])
  })

  test('names the file from the patch, and takes the label for a patch that names none', async () => {
    expect(parts(await block('diff label="Proposed"'), 'label').map((l) => l.textContent)).toEqual([
      'a.ts',
    ])
    const bare = await block('diff label="Proposed"', '@@ -1 +1 @@\n-a\n+b\n')
    expect(parts(bare, 'label').map((label) => label.textContent)).toEqual(['Proposed'])
  })

  test('copies the file as it now reads, the removed lines left out', async () => {
    const host = await block()
    const copy = host.shadowRoot?.querySelector('helix-headless-copy-button') as HTMLElement & {
      value: string
    }
    expect(copy.value).toBe('keep\nnew\nend')
  })

  test('draws ordinary code as ordinary code, however it happens to look', async () => {
    const host = await block('', PATCH)
    expect(parts(host, 'added')).toHaveLength(0)
    expect(parts(host, 'block')).toHaveLength(1)
  })

  test('keeps the slot, hidden, so a diff edited later is read again', async () => {
    const host = await block()
    const slot = host.shadowRoot?.querySelector('slot') as HTMLSlotElement
    expect(slot.hidden).toBe(true)
    host.textContent = '@@ -1 +1,2 @@\n a\n+b\n'
    await host.updateComplete
    await host.updateComplete
    expect(
      parts(host, 'added').map((line) => line.querySelector('[part="text"]')?.textContent?.trim()),
    ).toEqual(['b'])
  })

  test('writes no arrangement onto markup nobody asked for one on', async () => {
    expect((await block()).hasAttribute('variant')).toBe(false)
  })
})

describe('a split diff', () => {
  test('puts the old and the new version in blocks of their own, row for row', async () => {
    const host = await block('diff variant="split"')
    const [old] = parts(host, 'old')
    const [now] = parts(host, 'new')
    expect(old?.querySelectorAll('[part="removed"]')).toHaveLength(1)
    expect(now?.querySelectorAll('[part="added"]')).toHaveLength(1)
    const rows = (side: HTMLElement | undefined): number =>
      side?.querySelectorAll('[part="context"], [part="added"], [part="removed"], [part="filler"]')
        .length ?? 0
    expect(rows(old)).toBe(rows(now))
  })
})
