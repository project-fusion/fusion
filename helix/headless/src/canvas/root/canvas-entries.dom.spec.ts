import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * The minimap, the label editor, `arrange()` and paste are entries of their
 * own, so a board that uses none carries none of their code. A board asks its
 * class for each as it is used, and a class no entry added it to does nothing
 * there and says which entry to import.
 */

beforeAll(async () => {
  registerDom()
  const { HelixHeadlessCanvas } = await import('../index.js')
  /* A board class no entry has added anything to, as a page that imported
     none has, since the specs of this family share one registry. */
  customElements.define(
    'bare-board',
    class extends HelixHeadlessCanvas {
      static arrange = undefined
      static clipboard = undefined
      static drawLabelEditor = undefined
      static drawMinimap = undefined
      static openLabelEditor = undefined
      static paste = undefined
      static settle = undefined
    },
  )
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

type Board = HTMLElement & {
  arrange(): boolean
  paste(document: string): boolean
  updateComplete: Promise<boolean>
}

const CARDS = `
  <helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
  <helix-headless-canvas-node name="b" x="0" y="0" width="200" height="100">Second</helix-headless-canvas-node>
  <helix-headless-canvas-edge name="e1" from="a" to="b" label="then"></helix-headless-canvas-edge>
`

const board = async (extra = ''): Promise<Board> => {
  const host = (await mount(`<bare-board label="A board" ${extra}>${CARDS}</bare-board>`)) as Board
  await host.updateComplete
  return host
}

describe('a board without the entries', () => {
  test('draws no minimap, and says which entry to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = await board('controls="zoom minimap"')
    expect(part(host, 'minimap')).toBeNull()
    expect(part(host, 'zoom-in')).not.toBeNull()
    await painted()
    expect(warnings).toEqual([
      "<bare-board> names `minimap` in `controls`, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/canvas/minimap'.",
    ])
  })

  test('arranges and pastes nothing, and says which entries to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = await board()
    expect(host.arrange()).toBe(false)
    expect(
      host.paste('{"nodes":[{"id":"c","type":"text","x":0,"y":0,"width":10,"height":10}]}'),
    ).toBe(false)
    expect(host.querySelectorAll('helix-headless-canvas-node').length).toBe(2)
    await painted()
    expect(warnings).toEqual([
      "<bare-board> was asked to arrange its cards, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/canvas/arrange'.",
      "<bare-board> was asked to paste, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/canvas/paste'.",
    ])
  })

  test('opens no field for a label, and says which entry to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const host = await board()
    const stop = host.shadowRoot?.querySelector('[data-edge="edge:e1"]')
    stop?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'F2' }),
    )
    await host.updateComplete
    expect(part(host, 'label-editor')).toBeNull()
    await painted()
    expect(warnings).toEqual([
      "<bare-board> was asked to edit a label, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/canvas/label-editor'.",
    ])
  })
})
