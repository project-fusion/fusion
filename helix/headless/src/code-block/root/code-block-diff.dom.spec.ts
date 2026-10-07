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

  test('marks the words a changed line changed, inside its text', async () => {
    const host = await block(
      'diff',
      '--- a/a.ts\n+++ b/a.ts\n@@ -1,1 +1,1 @@\n-const size = 10\n+const size = 12\n',
    )
    expect(parts(host, 'changed').map((word) => word.textContent)).toEqual(['10', '12'])
    expect(parts(host, 'text').map((text) => text.textContent)).toEqual([
      'const size = 10\n',
      'const size = 12\n',
    ])
  })

  test('folds long runs of unchanged lines behind a button that shows them and hides them', async () => {
    const long = `--- a/a.ts\n+++ b/a.ts\n@@ -1,9 +1,9 @@\n a\n b\n c\n d\n-e\n+E\n f\n g\n h\n i\n`
    const host = await block('diff context-lines="1"', long)
    const fold = (): HTMLButtonElement[] => parts(host, 'fold') as HTMLButtonElement[]
    expect(fold().map((one) => [one.textContent, one.getAttribute('aria-expanded')])).toEqual([
      ['Show 3 unchanged lines', 'false'],
      ['Show 3 unchanged lines', 'false'],
    ])
    expect(parts(host, 'text').map((line) => line.textContent?.trim())).toEqual([
      'd',
      'e',
      'E',
      'f',
    ])
    fold()[0]?.click()
    await host.updateComplete
    expect(fold()[0]?.getAttribute('aria-expanded')).toBe('true')
    expect(fold()[0]?.textContent).toBe('Hide 3 unchanged lines')
    expect(parts(host, 'context')).toHaveLength(5)
    const all = await block('diff', long)
    expect(parts(all, 'fold')).toHaveLength(0)
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

  test('folds on both sides, with one control a reader reaches', async () => {
    const long = `--- a/a.ts\n+++ b/a.ts\n@@ -1,6 +1,6 @@\n a\n b\n c\n d\n-e\n+E\n f\n`
    const host = await block('diff variant="split" context-lines="0"', long)
    const [old] = parts(host, 'old')
    const [now] = parts(host, 'new')
    const shadow = now?.querySelector('[part="fold"]') as HTMLElement
    expect(old?.querySelector('[part="fold"]')?.localName).toBe('button')
    expect(shadow.getAttribute('aria-hidden')).toBe('true')
    shadow.click()
    await host.updateComplete
    expect(old?.querySelector('[part="fold"]')?.getAttribute('aria-expanded')).toBe('true')
    expect(now?.querySelectorAll('[part="context"]')).toHaveLength(5)
  })
})
