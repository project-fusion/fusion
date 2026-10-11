import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Device = HTMLElement & { updateComplete: Promise<boolean> }

const boxOf = (device: Device, name: string): DOMRect =>
  (part(device, name) as HTMLElement).getBoundingClientRect()

describe('styled device screen', () => {
  test('it is the headless screen, with the same events', async () => {
    const device = (await mount(
      '<helix-device-screen label="iPhone" screen-width="402" screen-height="874"></helix-device-screen>',
    )) as Device
    const heard: string[] = []
    device.addEventListener('helix-device-button', (event) => {
      heard.push((event as CustomEvent).detail.button)
    })
    ;(part(device, 'home') as HTMLElement).click()
    expect(heard).toEqual(['home'])
  })

  test('the hardware buttons are raised, and the page’s own are left as it wrote them', async () => {
    const device = (await mount(
      `<helix-device-screen label="iPhone" controls="home screenshot fullscreen">
        <helix-icon-button slot="controls" label="Record"></helix-icon-button>
      </helix-device-screen>`,
    )) as Device
    const raised = [
      ...(device.shadowRoot?.querySelectorAll('[part="controls"] > helix-icon-button') ?? []),
    ].map((button) => button.hasAttribute('raised'))
    expect(raised).toEqual([true, true, true])
    expect(device.querySelector('[slot="controls"]')?.hasAttribute('raised')).toBe(false)
  })

  if (hasLayout()) {
    test('a tall phone in a wide box takes the box’s height, and keeps its shape', async () => {
      const device = (await mount(
        `<div style="inline-size: 40rem">
          <helix-device-screen label="iPhone" controls="none" screen-width="402" screen-height="874" style="--device-screen-block-size: 20rem"></helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const area = boxOf(device, 'device')
      const bezel = boxOf(device, 'bezel')
      const screen = boxOf(device, 'screen')
      expect(bezel.height).toBeCloseTo(area.height, 0)
      expect(bezel.width).toBeLessThan(area.width)
      expect(screen.width / screen.height).toBeCloseTo(402 / 874, 2)
    })

    test('a tablet on its side in a narrow box takes the box’s width', async () => {
      const device = (await mount(
        `<div style="inline-size: 16rem">
          <helix-device-screen label="iPad" controls="none" screen-width="1180" screen-height="820" style="--device-screen-block-size: 30rem"></helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const area = boxOf(device, 'device')
      const bezel = boxOf(device, 'bezel')
      const screen = boxOf(device, 'screen')
      expect(bezel.width).toBeCloseTo(area.width, 0)
      expect(bezel.height).toBeLessThan(area.height)
      expect(screen.width / screen.height).toBeCloseTo(1180 / 820, 2)
    })

    test('a column of buttons too tall for the frame scrolls, and the device stays inside its box', async () => {
      const device = (await mount(
        `<div style="inline-size: 30rem">
          <helix-device-screen label="Pixel" controls="back home recents power volume rotate screenshot" controls-placement="end" screen-width="412" screen-height="915" style="--device-screen-block-size: 16rem"></helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const area = boxOf(device, 'device')
      const bezel = boxOf(device, 'bezel')
      const column = part(device, 'controls') as HTMLElement
      const columnBox = column.getBoundingClientRect()
      expect(column.scrollHeight).toBeGreaterThan(column.clientHeight)
      expect(columnBox.right).toBeLessThanOrEqual(area.right + 0.5)
      expect(bezel.right).toBeLessThanOrEqual(columnBox.left + 0.5)
      expect(bezel.left).toBeGreaterThanOrEqual(area.left - 0.5)
    })

    test('the empty box stands over the screen exactly, from beside it', async () => {
      const device = (await mount(
        `<div style="inline-size: 30rem">
          <helix-device-screen label="iPhone" controls="none" screen-width="402" screen-height="874" style="--device-screen-block-size: 20rem">
            <span slot="empty">No simulator is running</span>
          </helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const screen = boxOf(device, 'screen')
      const empty = boxOf(device, 'empty')
      for (const side of ['left', 'top', 'right', 'bottom'] as const) {
        expect(empty[side]).toBeCloseTo(screen[side], 0)
      }
    })

    test('a plain device is the screen alone', async () => {
      const device = (await mount(
        `<div style="inline-size: 30rem">
          <helix-device-screen label="iPhone" controls="none" separation="plain" screen-width="402" screen-height="874" style="--device-screen-block-size: 20rem"></helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const bezel = boxOf(device, 'bezel')
      const screen = boxOf(device, 'screen')
      expect(screen.width).toBeCloseTo(bezel.width, 0)
      expect(screen.height).toBeCloseTo(bezel.height, 0)
    })

    test('a picture turned a quarter fills the screen across', async () => {
      const device = (await mount(
        `<div style="inline-size: 40rem">
          <helix-device-screen label="iPhone" controls="none" rotation="90" screen-width="402" screen-height="874" style="--device-screen-block-size: 20rem">
            <canvas width="402" height="874"></canvas>
          </helix-device-screen>
        </div>`,
      ).then((host) => host.querySelector('helix-device-screen'))) as Device
      await device.updateComplete
      const screen = boxOf(device, 'screen')
      const canvas = (device.querySelector('canvas') as HTMLCanvasElement).getBoundingClientRect()
      expect(screen.width).toBeGreaterThan(screen.height)
      expect(canvas.width).toBeCloseTo(screen.width, 0)
      expect(canvas.height).toBeCloseTo(screen.height, 0)
    })
  }
})
