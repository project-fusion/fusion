import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

const pointer = (type: string, x: number, y: number, pointerType = 'mouse'): PointerEvent =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerType })

type Spot = HTMLElement & { updateComplete: Promise<unknown> }

const spotlight = async (
  markup = '<helix-spotlight><p>Card</p></helix-spotlight>',
): Promise<Spot> => {
  const spot = (await mount(markup)) as Spot
  spot.getBoundingClientRect = () =>
    ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200, x: 0, y: 0 }) as DOMRect
  return spot
}

describe('spotlight', () => {
  test('lights where a mouse is, and fades where it was as it leaves', async () => {
    const spot = await spotlight()
    spot.dispatchEvent(pointer('pointermove', 50, 30))
    await frame()
    await spot.updateComplete
    const glow = part(spot, 'glow') as HTMLElement
    expect(hasState(spot, 'lit')).toBe(true)
    expect(glow.style.getPropertyValue('--_spotlight-x')).toBe('25.00%')
    expect(glow.style.getPropertyValue('--_spotlight-y')).toBe('30.00%')
    expect((part(spot, 'edge') as HTMLElement).style.getPropertyValue('--_spotlight-x')).toBe(
      '25.00%',
    )
    spot.dispatchEvent(pointer('pointerleave', 300, 0))
    await spot.updateComplete
    expect(hasState(spot, 'lit')).toBe(false)
    expect(glow.style.getPropertyValue('--_spotlight-x')).toBe('25.00%')
  })

  test('lights under the pointer on a right-to-left page too, and follows no touch', async () => {
    const spot = await spotlight('<helix-spotlight dir="rtl"><p>Card</p></helix-spotlight>')
    spot.dispatchEvent(pointer('pointermove', 50, 30, 'touch'))
    await frame()
    expect(hasState(spot, 'lit')).toBe(false)
    spot.dispatchEvent(pointer('pointermove', 50, 30))
    await frame()
    await spot.updateComplete
    expect((part(spot, 'glow') as HTMLElement).style.getPropertyValue('--_spotlight-x')).toBe(
      '25.00%',
    )
  })
})
