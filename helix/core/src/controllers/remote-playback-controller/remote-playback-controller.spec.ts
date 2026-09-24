import { describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { RemotePlaybackController } from './remote-playback-controller.js'

/** A host that holds its controllers, and connects and disconnects them on request. */
const host = () => {
  const held: ReactiveController[] = []
  return {
    addController: (controller: ReactiveController) => held.push(controller),
    connect: () => {
      for (const one of held) {
        one.hostConnected?.()
      }
    },
    disconnect: () => {
      for (const one of held) {
        one.hostDisconnected?.()
      }
    },
  } as unknown as ReactiveControllerHost & { connect(): void; disconnect(): void }
}

/** A media element whose `remote` counts the watches open on it. */
const media = () => {
  const open = new Set<number>()
  let next = 0
  const remote = Object.assign(new EventTarget(), {
    cancelWatchAvailability: async (id: number) => {
      open.delete(id)
    },
    watchAvailability: async () => {
      next += 1
      open.add(next)
      return next
    },
  })
  return { element: { remote } as unknown as HTMLMediaElement, open }
}

describe('the availability watch across a move', () => {
  test('is cancelled on the way out and opened again on the way back', async () => {
    /* `attach` is called once, from the video's first render, so a watch the
       disconnect cancelled never came back: the control kept whatever it last
       knew about devices. */
    const element = host()
    const remote = new RemotePlaybackController(element, {
      available: () => {},
      connected: () => {},
    })
    const { element: video, open } = media()
    element.connect()
    await remote.attach(video)
    expect(open.size).toBe(1)

    element.disconnect()
    expect(open.size).toBe(0)

    element.connect()
    await Promise.resolve()
    await Promise.resolve()
    expect(open.size).toBe(1)
  })

  test('a watch that arrives after the host has gone is cancelled on arrival', async () => {
    const element = host()
    const remote = new RemotePlaybackController(element, {
      available: () => {},
      connected: () => {},
    })
    const { element: video, open } = media()
    element.connect()
    const attaching = remote.attach(video)
    element.disconnect()
    await attaching
    expect(open.size).toBe(0)
  })
})
