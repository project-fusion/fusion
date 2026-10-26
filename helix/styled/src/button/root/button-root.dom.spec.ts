import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-button') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/* Under reduced motion the base layer sets every duration token to 0.01ms, so a
   crawl scaled from one turned the ring about eight thousand times a second. */
describe('the pending ring under reduced motion', () => {
  test('turns once in four seconds, on no duration token', () => {
    const turn =
      sheet()
        .split('@media (prefers-reduced-motion: reduce)')
        .slice(1)
        .find((block) => /^\s*\{\s*\[part="spinner"\]\s*\{/.test(block))
        ?.split('}')[0] ?? ''
    expect(turn).toContain('animation-duration: var(--_button-crawl)')
    expect(turn).not.toContain('--helix-duration')
    expect(sheet()).toContain('--_button-crawl: 4s')
  })
})

/* A status crosses components: `warning` on a tag and on the filter button that
   selects it are one color, or the color is decoration. */
describe('a button takes the status tones', () => {
  test('each with the fill, ink, and edge of its own token', () => {
    const declared = (customElements.get('helix-button') as unknown as { styles: unknown }).styles
    const sheet = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n')
    for (const tone of ['info', 'success', 'warning']) {
      expect(sheet).toContain(`:host([tone="${tone}"])`)
      expect(sheet).toContain(`--helix-color-${tone}-surface`)
    }
  })
})

/* `:disabled` on the host is what the style table reads, and a form's disabled
   fieldset sets it as the button's own `disabled` does. Only a browser
   resolves the cascade and a fieldset's hold on what it holds. */
const drawn = hasLayout() ? test : (): void => {}

describe('a disabled button', () => {
  const opacity = async (markup: string): Promise<string> => {
    const holder = await mount(markup)
    const host = (
      holder.matches('helix-button') ? holder : holder.querySelector('helix-button')
    ) as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    return getComputedStyle(part(host, 'button') as Element).opacity
  }

  drawn('is drawn at half its opacity, by its own `disabled`', async () => {
    expect(await opacity('<helix-button disabled>Save</helix-button>')).toBe('0.5')
  })

  drawn('is drawn at half its opacity inside a disabled fieldset', async () => {
    expect(await opacity('<fieldset disabled><helix-button>Save</helix-button></fieldset>')).toBe(
      '0.5',
    )
  })

  drawn('is drawn whole inside a fieldset that is not disabled', async () => {
    expect(await opacity('<fieldset><helix-button>Save</helix-button></fieldset>')).toBe('1')
  })
})
