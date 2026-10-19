import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The transcript's scrollbar colors: the family's hooks first, then the shared
   scrollbar tokens. The sheet text holds in happy-dom; the computed colors need
   a browser, so run them with `bun run specs:browser chat`. */

/** The stylesheets the element adopts, as text, with a broken fallback joined. */
const sheet = (): string => {
  const declared = (customElements.get('helix-chat') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => {
      const styles = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
      return styles.cssText ?? Array.from(styles.cssRules ?? [], (rule) => rule.cssText).join('\n')
    })
    .join('\n')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ', ')
}

describe("the transcript's scrollbar", () => {
  test('falls back from the hooks to the shared scrollbar tokens', () => {
    const text = sheet()
    expect(text).toContain('var(--chat-scrollbar-thumb-color, var(--helix-scrollbar-thumb-color))')
    expect(text).toContain(
      'var(--chat-scrollbar-thumb-hover-color, var(--helix-scrollbar-thumb-hover-color))',
    )
    expect(text).toContain('var(--chat-scrollbar-track-color, var(--helix-scrollbar-track-color))')
    expect(text).not.toContain('scrollbar-color: var(--helix-color-border)')
  })

  test('steps up while the pointer is over the transcript', () => {
    const hovered = sheet().split('[part="log"]:hover {')[1]?.split('}')[0] ?? ''
    expect(hovered).toContain('scrollbar-color')
    expect(hovered).toContain('--helix-scrollbar-thumb-hover-color')
  })
})

if (hasLayout()) {
  describe("the transcript's scrollbar, computed", () => {
    const TOKENS =
      '--helix-scrollbar-thumb-color: rgb(1, 2, 3); --helix-scrollbar-track-color: rgb(4, 5, 6)'

    const chat = async (style: string): Promise<HTMLElement> => {
      const host = (await mount(
        `<helix-chat label="Support" style="${style}"></helix-chat>`,
      )) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    test('takes the shared tokens for its thumb and track', async () => {
      const log = part(await chat(TOKENS), 'log') as HTMLElement
      expect(getComputedStyle(log).scrollbarColor).toBe('rgb(1, 2, 3) rgb(4, 5, 6)')
    })

    test('takes the family’s hooks before the tokens', async () => {
      const log = part(
        await chat(`${TOKENS}; --chat-scrollbar-thumb-color: rgb(7, 8, 9)`),
        'log',
      ) as HTMLElement
      expect(getComputedStyle(log).scrollbarColor).toBe('rgb(7, 8, 9) rgb(4, 5, 6)')
    })
  })
}
