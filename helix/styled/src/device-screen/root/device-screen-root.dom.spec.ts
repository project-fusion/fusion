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
