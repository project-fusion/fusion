import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, unweighted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-switch') as unknown as { styles: unknown }).styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n'),
  )
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

/* The thumb is `foreground-on-primary`, which is solved against
   `primary-surface`. On `primary`, which is light in a dark theme, the white
   thumb all but vanished. */
describe('the switch when it is on', () => {
  test('fills its track with the ground its thumb is solved against', () => {
    expect(rule(':host(:state(checked)) [part="track"]')).toContain(
      'background-color: var(--switch-on-color, var(--helix-color-primary-surface))',
    )
  })

  test('draws the icon on its thumb in that ground', () => {
    expect(rule(':host(:state(checked)) [part="thumb"]')).toContain(
      'var(--switch-icon-color, var(--switch-on-color, var(--helix-color-primary-surface)))',
    )
  })
})
