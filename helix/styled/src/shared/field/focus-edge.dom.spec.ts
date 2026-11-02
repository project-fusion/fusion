import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* **A focused edge and its ring are one color, in a theme that sets them apart.**
 * Helix's default sets `focus-ring` to `primary`, so an edge that read `primary`
 * looked right in every example. Fusion's site set the ring to its accent with
 * ink actions, and each of these drew a white edge inside a blue ring.
 *
 * Only a browser can answer this: happy-dom resolves no cascade for `:focus-within`
 * or `:focus-visible`. Both tokens are set on the host, so what is measured is
 * which one the edge reads, whatever the page's theme. */
const RING = 'rgb(1, 2, 3)'
const PRIMARY = 'rgb(4, 5, 6)'

type Focused = {
  /** What is drawn with the edge and the ring. */
  edge: string
  /** What takes focus, in the shadow root. The host, where there is none. */
  focus?: string
  markup: string
  name: string
}

const FOCUSED: Focused[] = [
  { edge: '[part="field"]', markup: '<helix-input label="A"></helix-input>', name: 'an input' },
  {
    edge: '[part="trigger"]',
    focus: '[part="trigger"]',
    markup: '<helix-select label="A"><helix-option value="a">A</helix-option></helix-select>',
    name: 'a select',
  },
  {
    edge: '[part="trigger"]',
    focus: '[part="trigger"]',
    markup:
      '<helix-select emphasis="ghost" label="A"><helix-option value="a">A</helix-option></helix-select>',
    name: 'a ghost select',
  },
  {
    edge: '[part="items"]',
    focus: '[part="items"]',
    markup: '<helix-listbox label="A"><helix-option value="a">A</helix-option></helix-listbox>',
    name: 'a listbox',
  },
  {
    edge: '[part~="cell-active"]',
    markup: '<helix-pin-input label="A" length="4"></helix-pin-input>',
    name: 'the box a pin input is typing in',
  },
  {
    edge: '[part="value"]',
    focus: '[part="value"]',
    markup: '<helix-color-picker inline label="A"></helix-color-picker>',
    name: "a color picker's value",
  },
  {
    edge: '[part="field-input"]',
    focus: '[part="field-input"]',
    markup: '<helix-color-picker channel-fields inline label="A"></helix-color-picker>',
    name: "a color picker's channel",
  },
]

if (hasLayout()) {
  beforeAll(async () => {
    registerDom()
    await Promise.all([
      import('../../color-picker/index.js'),
      import('../../editor/index.js'),
      import('../../input/index.js'),
      import('../../listbox/index.js'),
      import('../../pin-input/index.js'),
      import('../../select/index.js'),
    ])
  })

  const apart = async (markup: string): Promise<HTMLElement> => {
    const host = await mount(markup)
    host.style.setProperty('--helix-color-focus-ring', RING)
    host.style.setProperty('--helix-color-primary', PRIMARY)
    return host
  }

  const expectOneColor = (edge: Element | null | undefined): void => {
    const style = getComputedStyle(edge as Element)
    expect(style.outlineStyle).not.toBe('none')
    expect(style.outlineColor).toBe(RING)
    expect(style.borderTopColor).toBe(RING)
  }

  describe('a focused edge', () => {
    for (const { edge, focus, markup, name } of FOCUSED) {
      test(`on ${name} reads the ring's color`, async () => {
        const host = await apart(markup)
        const target = focus ? host.shadowRoot?.querySelector<HTMLElement>(focus) : host
        target?.focus()
        await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
        expectOneColor(host.shadowRoot?.querySelector(edge))
      })
    }

    test("on an editor's frame reads the ring's color", async () => {
      /* The state stands in for focus in a document, which takes a whole ProseMirror
         to reach, and the state is what the rule reads. */
      const host = await apart('<helix-editor label="A"><div></div></helix-editor>')
      ;(host as unknown as { toggleState(name: string, on: boolean): void }).toggleState(
        'document-focused',
        true,
      )
      expectOneColor(host.shadowRoot?.querySelector('[part="region"]'))
    })
  })
}
