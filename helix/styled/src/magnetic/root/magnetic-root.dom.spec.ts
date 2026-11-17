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

describe('magnetic', () => {
  test('drifts toward a mouse, and springs back when it leaves', async () => {
    const magnetic = await mount('<helix-magnetic><button>Start</button></helix-magnetic>')
    magnetic.getBoundingClientRect = () =>
      ({ bottom: 40, height: 40, left: 0, right: 100, top: 0, width: 100, x: 0, y: 0 }) as DOMRect
    const surface = part(magnetic, 'surface') as HTMLElement
    magnetic.dispatchEvent(pointer('pointermove', 75, 20))
    await frame()
    await (magnetic as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(hasState(magnetic, 'pulled')).toBe(true)
    expect(surface.style.getPropertyValue('--_magnetic-x')).toBe('0.5')
    expect(surface.style.getPropertyValue('--_magnetic-y')).toBe('0')
    magnetic.dispatchEvent(pointer('pointerleave', 200, 20))
    await (magnetic as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(hasState(magnetic, 'pulled')).toBe(false)
    expect(surface.style.getPropertyValue('--_magnetic-x')).toBe('0')
  })
})
