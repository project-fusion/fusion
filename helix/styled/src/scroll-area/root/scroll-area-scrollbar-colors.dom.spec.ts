import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, unweighted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The scrollbar's colors: the family's hooks first, then the shared scrollbar
   tokens. The sheet text holds in happy-dom; the computed colors need a browser,
   so run them with `bun run specs:browser scroll-area`. */

/** The stylesheets the element adopts, as text, with a broken fallback joined. */
const sheet = (): string => {
  const declared = (customElements.get('helix-scroll-area') as unknown as { styles: unknown })
    .styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const styles = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return (
          styles.cssText ?? Array.from(styles.cssRules ?? [], (rule) => rule.cssText).join('\n')
        )
      })
      .join('\n'),
  )
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ', ')
}

describe('the scrollbar colors', () => {
  test('fall back from the hooks to the shared scrollbar tokens', () => {
    const text = sheet()
    expect(text).toContain('var(--scroll-area-thumb-color, var(--helix-scrollbar-thumb-color))')
    expect(text).toContain(
      'var(--scroll-area-thumb-hover-color, var(--helix-scrollbar-thumb-hover-color))',
    )
    expect(text).toContain('var(--scroll-area-track-color, var(--helix-scrollbar-track-color))')
    expect(text).not.toContain('var(--scroll-area-thumb-color, var(--helix-color-border))')
  })

  test('step up while the pointer is over the viewport', () => {
    const hovered = sheet().split('[part="viewport"]:hover {')[1]?.split('}')[0] ?? ''
    expect(hovered).toContain('scrollbar-color')
    expect(hovered).toContain('--helix-scrollbar-thumb-hover-color')
  })
})

if (hasLayout()) {
  describe('the scrollbar colors, computed', () => {
    const TOKENS =
      '--helix-scrollbar-thumb-color: rgb(1, 2, 3); --helix-scrollbar-track-color: rgb(4, 5, 6)'

    const tall = async (attrs: string, style: string): Promise<HTMLElement> => {
      const host = (await mount(
        `<helix-scroll-area ${attrs} style="display:block;block-size:200px;inline-size:200px;${style}"><p style="margin:0;block-size:800px">Tall</p></helix-scroll-area>`,
      )) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    test('take the shared tokens for the browser’s thumb and track', async () => {
      const view = part(await tall('', TOKENS), 'viewport') as HTMLElement
      expect(getComputedStyle(view).scrollbarColor).toBe('rgb(1, 2, 3) rgb(4, 5, 6)')
    })

    test('take the family’s hooks before the tokens', async () => {
      const view = part(
        await tall('', `${TOKENS}; --scroll-area-thumb-color: rgb(7, 8, 9)`),
        'viewport',
      ) as HTMLElement
      expect(getComputedStyle(view).scrollbarColor).toBe('rgb(7, 8, 9) rgb(4, 5, 6)')
    })

    test('paint a thumb drawn under `scrollbars` with the shared token', async () => {
      const host = await tall('scrollbars="always"', TOKENS)
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      const thumb = part(host, 'thumb-vertical') as HTMLElement
      expect(getComputedStyle(thumb).backgroundColor).toBe('rgb(1, 2, 3)')
      const bar = part(host, 'scrollbar-vertical') as HTMLElement
      expect(getComputedStyle(bar).backgroundColor).toBe('rgb(4, 5, 6)')
    })
  })
}
