import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

const pointer = (type: string, x: number, y: number): PointerEvent =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerType: 'mouse' })

describe('tilt', () => {
  test('turns toward a mouse, and settles flat when it leaves', async () => {
    const tilt = await mount('<helix-tilt><p>Card</p></helix-tilt>')
    tilt.getBoundingClientRect = () =>
      ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200, x: 0, y: 0 }) as DOMRect
    const surface = part(tilt, 'surface') as HTMLElement
    tilt.dispatchEvent(pointer('pointermove', 200, 0))
    await frame()
    await (tilt as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(hasState(tilt, 'tilting')).toBe(true)
    expect(surface.style.getPropertyValue('--_tilt-x')).toBe('1')
    expect(surface.style.getPropertyValue('--_tilt-y')).toBe('-1')
    tilt.dispatchEvent(pointer('pointerleave', 300, 0))
    await (tilt as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(hasState(tilt, 'tilting')).toBe(false)
    expect(surface.style.getPropertyValue('--_tilt-x')).toBe('0')
  })
})
