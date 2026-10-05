import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The busy state is the base tier's and is tested there, as is the fact that
   `shape` lives on this tier alone. */
const sheet = (): string => {
  const declared = (customElements.get('helix-skeleton') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('skeleton', () => {
  test('draws the surface the base tier renders, and shape reflects, resting on a block', async () => {
    const host = (await mount('<helix-skeleton></helix-skeleton>')) as Updatable & {
      shape?: string
    }
    expect(part(host, 'skeleton')).not.toBeNull()
    expect(host.hasAttribute('shape')).toBe(false)
    host.shape = 'circle'
    await host.updateComplete
    expect(host.getAttribute('shape')).toBe('circle')
  })

  /* The block had no height of its own, so an unsized skeleton drew nothing. */
  test('a block is the control height until a page sizes it', () => {
    expect(rule(':host(:not([shape]))')).toContain(
      'block-size: var(--skeleton-block-size, var(--helix-size-control))',
    )
  })

  test('a line of text is one line tall, and a circle is round at the control step', () => {
    // The control step rather than a bare rem, so a circle standing in for an
    // avatar shrinks with the density region the avatar would.
    expect(rule(':host([shape="text"])')).toContain('block-size: 1em')
    expect(rule(':host([shape="circle"])')).toContain('aspect-ratio: 1 / 1')
    expect(rule(':host([shape="circle"])')).toContain(
      'inline-size: var(--skeleton-size, var(--helix-size-control))',
    )
    for (const shape of ['text', 'circle']) {
      expect(rule(`:host([shape="${shape}"]) [part="skeleton"]`)).toContain(
        'border-radius: var(--helix-radii-full)',
      )
    }
  })

  test('the sweep is a layer moved across the fill, and the fill itself never animates', () => {
    /* A block fading in and out reads as something broken; a highlight
       traveling across it reads as work in progress. So the animated thing is
       a pseudo-element clipped by the surface, and the surface holds still. */
    expect(rule('[part="skeleton"]')).not.toContain('animation')
    expect(rule('[part="skeleton"]')).toContain('overflow: hidden')
    expect(rule('[part="skeleton"]::after')).toContain('animation: helix-skeleton-sweep')
    expect(sheet()).toContain('@keyframes helix-skeleton-sweep')
  })

  test('with motion reduced the placeholder simply sits there', () => {
    // The sweep is the whole effect, so nothing else is animated in its place.
    const reduced = sheet().split('@media (prefers-reduced-motion: reduce)')[1] ?? ''
    expect(reduced).toContain('animation: none')
    expect(reduced).toContain('background-image: none')
  })
})
