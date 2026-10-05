import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-loader') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

/* wa-spinner's `--speed` and `--track-width`, resting on the values the loader
   drew before they were hooks. */
describe('loader hooks', () => {
  test('the pace of a turn is a hook that rests on 0.8s', () => {
    expect(rule('[part="svg"]')).toContain(
      'animation: helix-loader-turn var(--loader-duration, var(--_loader-turn)) linear infinite',
    )
    expect(rule(':host')).toContain('--_loader-turn: 0.8s')
  })

  test('the arc and the ring take one width, which rests on two units', () => {
    expect(rule('[part="track"]')).toContain(
      'stroke-width: var(--loader-track-width, var(--_loader-stroke))',
    )
    expect(rule('[part="indicator"]')).toContain(
      'stroke-width: var(--loader-track-width, var(--_loader-stroke))',
    )
    expect(rule(':host')).toContain('--_loader-stroke: 2')
  })
})
