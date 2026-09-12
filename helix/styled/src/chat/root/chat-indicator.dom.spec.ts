import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* What stands in a turn's bubble while it waits. Every claim is about a box.
   Run them with `bun run specs:browser chat`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../orb/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const frames = async (host: Updatable): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await host.updateComplete
  }
}

const waiting = async (indicator: string): Promise<Updatable> => {
  const message = (await mount(
    `<helix-chat-message author="them" state="streaming">${indicator}</helix-chat-message>`,
  )) as Updatable
  await frames(message)
  return message
}

describe('an orb standing in for the dots', () => {
  geometry('keeps the whole of its box to draw in', async () => {
    /* Chipped, the padding came out of the orb's fixed size and left its canvas
       0 by 8 pixels: a pale disc with nothing drawn in it. */
    const message = await waiting('<helix-orb slot="indicator" state="fetching"></helix-orb>')
    const orb = message.querySelector('helix-orb') as Updatable
    await frames(orb)
    const canvas = orb.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
    const box = orb.getBoundingClientRect()
    expect(box.width).toBeGreaterThan(0)
    expect(canvas.clientWidth).toBe(Math.round(box.width))
    expect(canvas.clientHeight).toBe(Math.round(box.height))
  })

  geometry('stands on the bubble, as the dots do, with no chip of its own', async () => {
    const message = await waiting('<helix-orb slot="indicator" state="fetching"></helix-orb>')
    const orb = message.querySelector('helix-orb') as HTMLElement
    expect(getComputedStyle(orb).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })
})

describe('a status beside words', () => {
  geometry('is held in a chip, with the orb at its full size inside it', async () => {
    const message = await waiting(
      '<span slot="indicator"><helix-orb state="fetching"></helix-orb> Reading the release notes</span>',
    )
    const status = message.querySelector('span') as HTMLElement
    const orb = message.querySelector('helix-orb') as Updatable
    await frames(orb)
    expect(getComputedStyle(status).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    const canvas = orb.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.clientWidth).toBeGreaterThan(0)
    expect(canvas.clientWidth).toBe(Math.round(orb.getBoundingClientRect().width))
  })
})
