import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it
   applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-announcement') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('announcement hooks', () => {
  /* The size, the alignment and the tint were fixed, so a band lined up with
     the page under it, or tinted in a brand color, meant a fork. */
  test('the size, the alignment and the tint take hooks that rest on the values they had', () => {
    expect(sheet()).toContain('font-size: var(--announcement-font-size, var(--helix-text-sm))')
    expect(sheet()).toContain('text-align: var(--announcement-text-align, center)')
    expect(sheet()).toContain(
      '--_announcement-tint: var(--announcement-tone-color, var(--_announcement-color))',
    )
    /* Every mix reads the hooked color, and none the tone's directly. */
    expect(sheet()).toMatch(/color-mix\(in oklab, var\(--_announcement-tint\) 18%/)
    expect(sheet()).not.toMatch(/color-mix\(\s*in oklab,\s*var\(--_announcement-color\)/)
  })
})

/* The dismiss button is out of flow and only the message was padded clear of
   it, so a link in the actions ran under the cross. */
describe('a dismissible announcement with actions', () => {
  test('keeps the actions clear of the dismiss button', () => {
    expect(sheet()).toContain(':host([dismissible]) [part="actions"]')
  })

  if (hasLayout()) {
    test('draws the last action before the dismiss button starts', async () => {
      const host = await mount(
        '<helix-announcement dismissible style="inline-size: 700px">Trial ends soon<a slot="actions" href="#x">Upgrade</a></helix-announcement>',
      )
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      const link = host.querySelector('a')?.getBoundingClientRect()
      const dismiss = part(host, 'dismiss')?.getBoundingClientRect()
      expect((link?.right ?? 0) <= (dismiss?.left ?? 0)).toBe(true)
    })
  }
})
