import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { html, LitElement, type TemplateResult } from 'lit'
import { HoverMarkController } from './hover-mark-controller.js'

class Strip extends LitElement {
  heard: boolean[] = []

  glide = new HoverMarkController(this, {
    gliding: (on) => this.heard.push(on),
    item: (under) =>
      under.find(
        (one): one is HTMLElement => one instanceof HTMLElement && one.parentElement === this,
      ),
    mark: () => this.renderRoot.querySelector<HTMLElement>('[part="mark"]'),
    surface: () => this.renderRoot.querySelector<HTMLElement>('[part="surface"]'),
  })

  protected override render(): TemplateResult {
    return html`<div part="surface"><span part="mark"></span><slot></slot></div>`
  }
}

beforeAll(() => {
  registerDom()
  customElements.define('hover-mark-strip', Strip)
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 32))

const box = (left: number, width: number) => () =>
  ({ bottom: 32, height: 32, left, right: left + width, top: 0, width, x: left, y: 0 }) as DOMRect

const strip = async (): Promise<{
  strip: Strip
  items: [HTMLElement, HTMLElement]
  mark: HTMLElement
}> => {
  const element = document.createElement('hover-mark-strip') as Strip
  element.innerHTML = '<a href="#a">One</a><a href="#b">Two</a>'
  document.body.append(element)
  await element.updateComplete
  const items = [...element.children] as [HTMLElement, HTMLElement]
  items[0].getBoundingClientRect = box(0, 60)
  items[1].getBoundingClientRect = box(60, 80)
  const surface = element.renderRoot.querySelector('[part="surface"]') as HTMLElement
  surface.getBoundingClientRect = box(0, 140)
  return {
    items,
    mark: element.renderRoot.querySelector('[part="mark"]') as HTMLElement,
    strip: element,
  }
}

const over = (target: HTMLElement, pointerType = 'mouse'): void => {
  target.dispatchEvent(
    new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType }),
  )
}

describe('the mark under the pointer', () => {
  test('is placed over the item a mouse arrives at, and glides from the frame after', async () => {
    const { items, mark, strip: element } = await strip()
    over(items[1])
    expect(mark.hasAttribute('data-placed')).toBe(true)
    expect(mark.style.getPropertyValue('--indicator-x')).toBe('60px')
    expect(mark.style.getPropertyValue('--indicator-inline-size')).toBe('80px')
    expect(mark.hasAttribute('data-gliding')).toBe(false)
    await frame()
    expect(mark.hasAttribute('data-gliding')).toBe(true)
    expect(element.heard).toEqual([true])
  })

  test('moves to the next item, and leaves with the pointer', async () => {
    const { items, mark, strip: element } = await strip()
    over(items[0])
    await frame()
    over(items[1])
    expect(mark.style.getPropertyValue('--indicator-x')).toBe('60px')
    element.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(mark.hasAttribute('data-placed')).toBe(false)
    expect(mark.hasAttribute('data-gliding')).toBe(false)
    expect(element.heard).toEqual([true, false])
  })

  test('holds over the gap between items, and leaves off the strip', async () => {
    const { items, mark, strip: element } = await strip()
    over(items[0])
    await frame()
    const surface = element.renderRoot.querySelector('[part="surface"]') as HTMLElement
    surface.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    expect(mark.hasAttribute('data-placed')).toBe(true)
    expect(element.glide.hovered).toBe(items[0])
    element.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    expect(mark.hasAttribute('data-placed')).toBe(false)
  })

  test('follows no touch', async () => {
    const { items, mark } = await strip()
    over(items[0], 'touch')
    expect(mark.hasAttribute('data-placed')).toBe(false)
  })
})
