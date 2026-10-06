import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it
   applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-image') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('image hooks', () => {
  /* The fade and the fallback's colors were fixed, so a page could neither
     show a picture at once nor tell a failure from a wait. */
  test('the fade and the fallback take hooks that rest on the values they had', () => {
    expect(sheet()).toMatch(
      /transition: opacity var\(--image-fade-duration, var\(--helix-duration-normal\)\)/,
    )
    expect(sheet()).toMatch(
      /color: var\(--image-fallback-color, var\(--helix-color-foreground-subtle\)\)/,
    )
    expect(sheet()).toMatch(
      /--image-fallback-background-color,\s*var\(--image-placeholder-color, var\(--helix-color-surface-sunken\)\)/,
    )
  })

  /* An engine without `CustomStateSet` records no state, and a picture shown
     by `:state(loaded)` alone would stay transparent there. */
  test('the picture is shown from the status mirror, which every engine has', () => {
    expect(sheet()).toContain(':host([data-status="loaded"]) [part="image"]')
  })
})
