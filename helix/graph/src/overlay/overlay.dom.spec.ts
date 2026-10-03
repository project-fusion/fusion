import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let overlay: typeof import('./overlay.js')

beforeAll(async () => {
  registerDom()
  overlay = await import('./overlay.js')
})

/** A container on the page with a canvas in it, as a renderer leaves one. */
const containerOf = (): { canvas: HTMLCanvasElement; container: HTMLElement } => {
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.style.touchAction = 'none'
  container.append(canvas)
  document.body.append(container)
  return { canvas, container }
}

/** Whether an event of `type` dispatched on the canvas reaches a listener on it. */
const reaches = (canvas: HTMLCanvasElement, event: Event): boolean => {
  let reached = false
  const listener = (): void => {
    reached = true
  }
  canvas.addEventListener(event.type, listener)
  canvas.dispatchEvent(event)
  canvas.removeEventListener(event.type, listener)
  return reached
}

describe('gesturesHeld', () => {
  test('gives the page its touches over the renderer’s canvases, and takes the rule’s hold off when stopped', () => {
    const { container } = containerOf()
    const held = overlay.gesturesHeld(container)
    held.set('cooperative')
    expect(container.getAttribute('data-helix-graph-gestures')).toBe('cooperative')
    const rule = document.head.querySelector('style[data-helix-graph-gestures]')?.textContent ?? ''
    expect(rule).toContain('touch-action: pan-x pan-y !important')
    held.set('free')
    expect(container.hasAttribute('data-helix-graph-gestures')).toBe(false)
    held.set('off')
    held.stop()
    expect(container.hasAttribute('data-helix-graph-gestures')).toBe(false)
  })

  test('off keeps a plain wheel and a double click from the renderer, and lets one click through', () => {
    const { canvas, container } = containerOf()
    const held = overlay.gesturesHeld(container)
    held.set('off')
    expect(reaches(canvas, new WheelEvent('wheel', { bubbles: true, deltaY: 10 }))).toBe(false)
    expect(reaches(canvas, new MouseEvent('dblclick', { bubbles: true, detail: 2 }))).toBe(false)
    expect(reaches(canvas, new MouseEvent('click', { bubbles: true, detail: 2 }))).toBe(false)
    expect(reaches(canvas, new MouseEvent('click', { bubbles: true, detail: 1 }))).toBe(true)
    held.stop()
  })

  test('cooperative keeps a plain wheel from the renderer and gives it one with a modifier', () => {
    const { canvas, container } = containerOf()
    const held = overlay.gesturesHeld(container)
    held.set('cooperative')
    expect(reaches(canvas, new WheelEvent('wheel', { bubbles: true, deltaY: 10 }))).toBe(false)
    /* happy-dom's wheel event leaves its modifier keys out, so the key is set on it. */
    const pinch = new WheelEvent('wheel', { bubbles: true, deltaY: 10 })
    Object.defineProperty(pinch, 'ctrlKey', { value: true })
    expect(reaches(canvas, pinch)).toBe(true)
    expect(reaches(canvas, new MouseEvent('dblclick', { bubbles: true, detail: 2 }))).toBe(true)
    held.stop()
  })
})

describe('signalsOver', () => {
  test('draws nothing for a drawing taken off the page', () => {
    const { container } = containerOf()
    const signals = overlay.signalsOver(container, () => ({ radius: 4, x: 10, y: 10 }))
    container.remove()
    signals.signal('a', 'b', undefined, true)
    expect(container.querySelector('canvas[data-helix-graph-layer="signals"]')).toBeNull()
    signals.stop()
  })
})

describe('colors', () => {
  test('a light ink says the ground is dark', () => {
    expect(overlay.isLight('rgb(240, 240, 240)')).toBe(true)
    expect(overlay.isLight('rgb(20, 20, 20)')).toBe(false)
  })

  test('ease leaves and arrives gently, and is halfway at the middle', () => {
    expect(overlay.ease(0)).toBe(0)
    expect(overlay.ease(0.5)).toBe(0.5)
    expect(overlay.ease(1)).toBe(1)
    expect(overlay.ease(0.1)).toBeLessThan(0.1)
  })
})
