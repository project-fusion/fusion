import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A row of controls a component draws in its own shadow root, one tab stop
 * that the arrow keys move along. `Toolbar`'s own specs hold the page's half:
 * controls written in light DOM, claimed once they upgrade.
 */
type Pad = HTMLElement & {
  shown: string[]
  updateComplete: Promise<boolean>
  vertical: boolean
}

beforeAll(async () => {
  registerDom()
  const { LitElement, html } = await import('lit')
  const { ToolbarController } = await import('./toolbar-controller.js')
  /* A pad of buttons beside a board, as Canvas's controls sit beside its cards. */
  class TestPad extends LitElement {
    static override properties = {
      shown: { attribute: false },
      vertical: { type: Boolean },
    }
    /* Declared, with the defaults set in the constructor: a class field would
       shadow the reactive accessor Lit defines, and a change would draw nothing. */
    declare shown: string[]
    declare vertical: boolean
    constructor() {
      super()
      this.shown = ['up', 'down', 'zoom']
      this.vertical = false
    }
    controls = new ToolbarController(this, {
      members: () => [...(this.renderRoot.querySelector('[part="controls"]')?.children ?? [])],
      orientation: () => (this.vertical ? 'vertical' : 'horizontal'),
      own: true,
      watch: () => this.renderRoot,
    })
    override render() {
      return html`<div part="controls" role="toolbar">
          ${this.shown.map((name) => html`<button id=${name} type="button">${name}</button>`)}
        </div>
        <div id="board" tabindex="0"></div>`
    }
  }
  customElements.define('test-pad', TestPad)
})

const pad = async (attributes = ''): Promise<Pad> => {
  document.body.innerHTML = `<test-pad ${attributes}></test-pad>`
  const host = document.body.firstElementChild as Pad
  await host.updateComplete
  await settled()
  return host
}

/** The microtasks the controller waits on before it writes: the upgrade check. */
const settled = async (): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) {
    await Promise.resolve()
  }
}

const button = (host: Pad, id: string): HTMLElement =>
  host.shadowRoot?.getElementById(id) as HTMLElement

/** Which of the pad's buttons hold the tab stop, by id. */
const stops = (host: Pad): string[] =>
  [...(host.shadowRoot?.querySelectorAll('button') ?? [])]
    .filter((one) => one.getAttribute('tabindex') === '0')
    .map((one) => one.id)

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  target.dispatchEvent(event)
  return event
}

describe('a row of controls a component draws itself', () => {
  test('is one tab stop as soon as it renders, on the first control', async () => {
    const host = await pad()
    expect(stops(host)).toEqual(['up'])
    expect(button(host, 'down').getAttribute('tabindex')).toBe('-1')
    expect(button(host, 'zoom').getAttribute('tabindex')).toBe('-1')
  })

  test('moves the stop along its axis, wrapping, and to the ends with Home and End', async () => {
    const host = await pad()
    expect(press(button(host, 'up'), 'ArrowRight').defaultPrevented).toBe(true)
    expect(stops(host)).toEqual(['down'])
    press(button(host, 'down'), 'End')
    expect(stops(host)).toEqual(['zoom'])
    press(button(host, 'zoom'), 'ArrowRight')
    expect(stops(host)).toEqual(['up'])
    press(button(host, 'up'), 'ArrowLeft')
    expect(stops(host)).toEqual(['zoom'])
    press(button(host, 'zoom'), 'Home')
    expect(stops(host)).toEqual(['up'])
  })

  test('leaves the arrows across its axis, and a press that starts elsewhere, to the host', async () => {
    const host = await pad('vertical')
    expect(press(button(host, 'up'), 'ArrowRight').defaultPrevented).toBe(false)
    expect(press(button(host, 'up'), 'ArrowDown').defaultPrevented).toBe(true)
    expect(stops(host)).toEqual(['down'])
    const board = host.shadowRoot?.getElementById('board') as HTMLElement
    expect(press(board, 'ArrowDown').defaultPrevented).toBe(false)
    expect(stops(host)).toEqual(['down'])
  })

  test('keeps the stop where it was across a render', async () => {
    const host = await pad()
    press(button(host, 'up'), 'ArrowRight')
    host.shown = ['up', 'down', 'zoom', 'fullscreen']
    await host.updateComplete
    await settled()
    expect(stops(host)).toEqual(['down'])
    expect(button(host, 'fullscreen').getAttribute('tabindex')).toBe('-1')
  })

  test('hands the stop to the first control when the one holding it leaves or is disabled', async () => {
    const host = await pad()
    press(button(host, 'up'), 'End')
    host.shown = ['up', 'down']
    await host.updateComplete
    await settled()
    expect(stops(host)).toEqual(['up'])
    press(button(host, 'up'), 'ArrowRight')
    button(host, 'down').setAttribute('disabled', '')
    await settled()
    await new Promise((resolve) => setTimeout(resolve, 0))
    /* A disabled button takes no focus whatever its `tabindex` says. */
    expect(stops(host).filter((id) => !button(host, id).hasAttribute('disabled'))).toEqual(['up'])
  })
})
