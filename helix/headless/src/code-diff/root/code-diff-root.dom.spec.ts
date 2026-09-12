import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Diff = HTMLElement & { patch: string; updateComplete: Promise<unknown>; variant?: string }

const PATCH = `--- a/a.ts
+++ b/a.ts
@@ -8,3 +8,3 @@
 keep
-old
+new
 end
`

const diff = async (attrs = ''): Promise<Diff> => {
  const host = (await mount(
    `<helix-headless-code-diff ${attrs}></helix-headless-code-diff>`,
  )) as Diff
  host.patch = PATCH
  await host.updateComplete
  return host
}

const parts = (host: HTMLElement, name: string): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>(`[part="${name}"]`) ?? []),
]

describe('a code diff', () => {
  test('marks an added line as an insertion and a removed one as a deletion', async () => {
    const host = await diff()
    expect(parts(host, 'added').map((line) => line.localName)).toEqual(['ins'])
    expect(parts(host, 'removed').map((line) => line.localName)).toEqual(['del'])
    expect(parts(host, 'context')).toHaveLength(2)
  })

  test('says what happened in text as well, so it is not carried by color', async () => {
    const host = await diff()
    const [added] = parts(host, 'added')
    const [removed] = parts(host, 'removed')
    expect(added?.querySelector('[part="marker"]')?.textContent).toBe('+')
    expect(removed?.querySelector('[part="marker"]')?.textContent).toBe('-')
  })

  test('numbers the lines as the file does, and keeps the numbers from being read aloud', async () => {
    const host = await diff()
    const numbers = parts(host, 'number')
    expect(numbers.every((number) => number.getAttribute('aria-hidden') === 'true')).toBe(true)
    const [first] = parts(host, 'context')
    expect(
      [...(first?.querySelectorAll('[part="number"]') ?? [])].map((n) => n.textContent?.trim()),
    ).toEqual(['8', '8'])
  })

  test('names the file from the patch, over the label', async () => {
    const host = await diff('label="Proposed"')
    expect(parts(host, 'label').map((label) => label.textContent)).toEqual(['a.ts'])
  })

  test('takes the label for a patch that names no file', async () => {
    const host = (await mount(
      '<helix-headless-code-diff label="Proposed"></helix-headless-code-diff>',
    )) as Diff
    host.patch = '@@ -1 +1 @@\n-a\n+b\n'
    await host.updateComplete
    expect(parts(host, 'label').map((label) => label.textContent)).toEqual(['Proposed'])
  })

  test('writes no arrangement onto markup nobody asked for one on', async () => {
    expect((await diff()).hasAttribute('variant')).toBe(false)
  })
})

describe('a split code diff', () => {
  test('puts the old file and the new one in blocks of their own, row for row', async () => {
    const host = await diff('variant="split"')
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
