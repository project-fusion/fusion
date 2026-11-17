import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { LitElement } from 'lit'
import { PointerFollowController } from './pointer-follow-controller.js'

class Follower extends LitElement {
  heard: string[] = []

  follow = new PointerFollowController(this, {
    left: () => this.heard.push('left'),
    moved: (x, y) => this.heard.push(`${x.toFixed(2)} ${y.toFixed(2)}`),
  })
}

beforeAll(() => {
  registerDom()
  customElements.define('pointer-follower', Follower)
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

const follower = async (): Promise<Follower> => {
  const element = document.createElement('pointer-follower') as Follower
  document.body.append(element)
  await element.updateComplete
  element.getBoundingClientRect = () =>
    ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200, x: 0, y: 0 }) as DOMRect
  return element
}

const pointer = (type: string, x: number, y: number, pointerType = 'mouse'): PointerEvent =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerType })

describe('following the pointer', () => {
  test('hands over where a mouse is, as shares of the half-width and half-height', async () => {
    const element = await follower()
    element.dispatchEvent(pointer('pointermove', 150, 25))
    await frame()
    expect(element.heard).toEqual(['0.50 -0.50'])
  })

  test('hands over one position a frame, the last heard', async () => {
    const element = await follower()
    element.dispatchEvent(pointer('pointermove', 0, 0))
    element.dispatchEvent(pointer('pointermove', 100, 50))
    await frame()
    expect(element.heard).toEqual(['0.00 0.00'])
  })

  test('follows no touch', async () => {
    const element = await follower()
    element.dispatchEvent(pointer('pointermove', 150, 25, 'touch'))
    await frame()
    element.dispatchEvent(pointer('pointerleave', 0, 0, 'touch'))
    expect(element.heard).toEqual([])
  })

  test('says when the pointer leaves, once it has followed it', async () => {
    const element = await follower()
    element.dispatchEvent(pointer('pointermove', 200, 100))
    await frame()
    element.dispatchEvent(pointer('pointerleave', 300, 100))
    expect(element.heard).toEqual(['1.00 1.00', 'left'])
  })
})
