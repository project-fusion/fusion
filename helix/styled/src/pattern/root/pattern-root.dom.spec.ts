import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

type Pattern = HTMLElement & { motif: string; updateComplete: Promise<unknown> }

describe('pattern', () => {
  test('lights the glow where a mouse is over hexagons, and puts it out when it leaves', async () => {
    const pattern = (await mount('<helix-pattern><p>Welcome</p></helix-pattern>')) as Pattern
    pattern.getBoundingClientRect = () =>
      ({
        bottom: 200,
        height: 200,
        left: 10,
        right: 310,
        top: 20,
        width: 300,
        x: 10,
        y: 20,
      }) as DOMRect
    pattern.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 110, clientY: 70, pointerType: 'mouse' }),
    )
    await frame()
    await pattern.updateComplete
    const glow = part(pattern, 'glow') as HTMLElement
    expect(glow.hasAttribute('data-on')).toBe(true)
    expect(glow.style.getPropertyValue('--_pattern-x')).toBe('100px')
    expect(glow.style.getPropertyValue('--_pattern-y')).toBe('50px')
    pattern.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await pattern.updateComplete
    expect(glow.hasAttribute('data-on')).toBe(false)
  })

  test('lights no glow for a touch, nor over stars', async () => {
    const pattern = (await mount('<helix-pattern><p>Welcome</p></helix-pattern>')) as Pattern
    pattern.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch' }))
    pattern.motif = 'stars'
    await pattern.updateComplete
    pattern.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse' }))
    await frame()
    await pattern.updateComplete
    expect((part(pattern, 'glow') as HTMLElement).hasAttribute('data-on')).toBe(false)
  })

  test('holds while the page has paused its motion', async () => {
    const pattern = await mount('<helix-pattern motif="stars"></helix-pattern>')
    expect(hasState(pattern, 'paused')).toBe(false)
    pauseMotion()
    await frame()
    expect(hasState(pattern, 'paused')).toBe(true)
  })
})
