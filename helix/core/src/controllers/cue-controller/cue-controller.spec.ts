import { describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { CueController } from './cue-controller.js'

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

describe('a caption track followed across a move', () => {
  test('is heard again after the host reconnects, without choosing it again', () => {
    /* A track is chosen on `loadedmetadata`, and moving a video reloads
       nothing, so a controller that forgot it on the way out left the caption
       frozen on whatever it last said. */
    const element = host()
    let heard = 0
    const cues = new CueController(element, () => {
      heard += 1
    })
    element.connect()
    const track = new EventTarget() as TextTrack
    cues.follow(track)
    track.dispatchEvent(new Event('cuechange'))
    expect(heard).toBe(1)

    element.disconnect()
    track.dispatchEvent(new Event('cuechange'))
    expect(heard).toBe(1)

    element.connect()
    track.dispatchEvent(new Event('cuechange'))
    expect(heard).toBe(2)
  })
})
