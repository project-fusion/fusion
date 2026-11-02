import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, unweighted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   Scrolling, folding and the landmark are the base tier's and are tested
   there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-app-header') as unknown as { styles: unknown }).styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n'),
  )
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('app header', () => {
  test('reflects overlay, sticky, and material, which its rules select', async () => {
    const header = (await mount('<helix-app-header></helix-app-header>')) as HTMLElement & {
      material?: string
      overlay: boolean
      sticky: boolean
      updateComplete: Promise<boolean>
    }
    expect(header.hasAttribute('overlay')).toBe(false)
    header.overlay = true
    header.sticky = true
    header.material = 'glass'
    await header.updateComplete
    expect(header.getAttribute('overlay')).toBe('')
    expect(header.getAttribute('sticky')).toBe('')
    expect(header.getAttribute('material')).toBe('glass')
  })

  test('takes back its own height under overlay and stands over the section after it', () => {
    const overlay = rule(':host([overlay])')
    expect(overlay).toContain(
      'margin-block-end: calc(var(--app-header-block-size, var(--helix-size-header)) * -1 - env(safe-area-inset-top, 0px))',
    )
    expect(overlay).toContain('z-index: var(--helix-layer-sticky)')
  })

  test('stands clear of the notch by the top safe area, as a phone’s bar does', () => {
    expect(sheet()).toContain('padding-block-start: env(safe-area-inset-top, 0px)')
  })

  test('draws the generated sheet, with the glass a transparent bar takes once scrolled', () => {
    expect(rule(':host(:state(scrolled)[material="transparent"])')).toContain(
      'backdrop-filter: var(--app-header-backdrop, var(--helix-material-backdrop))',
    )
  })
})
