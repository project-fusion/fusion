import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import { html, LitElement, type TemplateResult } from 'lit'
import { FocusMarkController } from './focus-mark-controller.js'

class Strip extends LitElement {
  heard: boolean[] = []

  on = true

  ring = new FocusMarkController(this, {
    enabled: () => this.on,
    gliding: (on) => this.heard.push(on),
    items: () => [...this.children] as HTMLElement[],
    mark: () => this.renderRoot.querySelector<HTMLElement>('[part="focus"]'),
    surface: () => this.renderRoot.querySelector<HTMLElement>('[part="surface"]'),
  })

  protected override render(): TemplateResult {
    return html`<div part="surface" style="position: relative; display: flex; gap: 8px"><slot></slot><span part="focus" style="position: absolute"></span></div>`
  }
}

beforeAll(() => {
  registerDom()
  customElements.define('focus-mark-strip', Strip)
})

afterEach(() => {
  document.body.replaceChildren()
})

const strip = async (): Promise<{
  strip: Strip
  buttons: HTMLButtonElement[]
  mark: HTMLElement
}> => {
  const element = document.createElement('focus-mark-strip') as Strip
  element.innerHTML = '<button>One</button><button>Two</button>'
  document.body.append(element)
  await element.updateComplete
  return {
    buttons: [...element.querySelectorAll('button')],
    mark: element.renderRoot.querySelector('[part="focus"]') as HTMLElement,
    strip: element,
  }
}

/* Browser only: `:focus-visible` and layout are the whole of what it reads. */
const run = hasLayout() ? test : (): void => {}

describe('the focus ring that travels', () => {
  test('draws nothing while no item has focus', async () => {
    const { mark, strip: element } = await strip()
    element.ring.place()
    expect(mark.hasAttribute('data-placed')).toBe(false)
    expect(element.heard).toEqual([])
  })

  run(
    'lands on the control with visible focus, takes its ring, and leaves with focus',
    async () => {
      const { buttons, mark, strip: element } = await strip()
      buttons[0]?.focus({ focusVisible: true } as FocusOptions)
      element.ring.place()
      expect(mark.hasAttribute('data-placed')).toBe(true)
      expect(mark.style.getPropertyValue('outline-offset')).not.toBe('')
      expect(element.heard).toEqual([true])
      buttons[0]?.blur()
      element.ring.place()
      expect(mark.hasAttribute('data-placed')).toBe(false)
      expect(element.heard).toEqual([true, false])
    },
  )

  run('draws none where the host turns it off', async () => {
    const { buttons, mark, strip: element } = await strip()
    element.on = false
    buttons[1]?.focus({ focusVisible: true } as FocusOptions)
    element.ring.place()
    expect(mark.hasAttribute('data-placed')).toBe(false)
  })
})
