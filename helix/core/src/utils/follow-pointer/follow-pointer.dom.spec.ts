import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { followPointer } from './follow-pointer.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.body.replaceChildren()
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

const pointer = (type: string, x: number, y: number, pointerType = 'mouse'): PointerEvent =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerType })

const card = (): HTMLElement => {
  const element = document.createElement('div')
  element.getBoundingClientRect = () =>
    ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200, x: 0, y: 0 }) as DOMRect
  document.body.append(element)
  return element
}

describe('following the pointer over a plain element', () => {
  test('writes where a mouse is, and takes it off when the pointer leaves', async () => {
    const element = card()
    const heard: string[] = []
    const stop = followPointer(element, { moved: (x, y) => heard.push(`${x} ${y}`) })
    element.dispatchEvent(pointer('pointermove', 150, 25))
    await frame()
    expect(element.style.getPropertyValue('--pointer-x')).toBe('0.500')
    expect(element.style.getPropertyValue('--pointer-y')).toBe('-0.500')
    expect(element.hasAttribute('data-following')).toBe(true)
    expect(heard).toEqual(['0.5 -0.5'])
    element.dispatchEvent(pointer('pointerleave', 0, 0))
    expect(element.style.getPropertyValue('--pointer-x')).toBe('')
    expect(element.hasAttribute('data-following')).toBe(false)
    stop()
  })

  test('follows no touch, and nothing once stopped', async () => {
    const element = card()
    const stop = followPointer(element)
    element.dispatchEvent(pointer('pointermove', 150, 25, 'touch'))
    await frame()
    expect(element.style.getPropertyValue('--pointer-x')).toBe('')
    stop()
    element.dispatchEvent(pointer('pointermove', 150, 25))
    await frame()
    expect(element.style.getPropertyValue('--pointer-x')).toBe('')
  })
})
