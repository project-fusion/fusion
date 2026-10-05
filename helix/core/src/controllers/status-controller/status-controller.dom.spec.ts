import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

/* Imported once the page exists, since Lit reads `document` as it loads. */
let StatusController: typeof import('./status-controller.js').StatusController
let drawStatus: typeof import('./status-controller.js').drawStatus
let render: typeof import('lit').render
type StatusController = import('./status-controller.js').StatusController

beforeAll(async () => {
  registerDom()
  ;({ drawStatus, StatusController } = await import('./status-controller.js'))
  ;({ render } = await import('lit'))
})

/** A host that holds its controllers and counts the updates it was asked for. */
const host = () => {
  const held: ReactiveController[] = []
  const element = {
    addController: (controller: ReactiveController) => held.push(controller),
    asked: 0,
    requestUpdate: () => {
      element.asked += 1
    },
  }
  return element as unknown as ReactiveControllerHost & { asked: number }
}

const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

/** What `drawStatus` puts on a page now. */
const drawn = (status: StatusController): string => {
  const box = document.createElement('div')
  render(drawStatus(status), box)
  return box.innerHTML.replace(/<!--[^>]*-->/g, '')
}

describe('a status region rendered once it has something to say', () => {
  test('is not rendered until the first time', () => {
    const status = new StatusController(host())
    expect(status.spoken).toBe(false)
    expect(drawn(status)).toBe('')
  })

  test('arrives empty, and its words land a frame later', async () => {
    const element = host()
    const status = new StatusController(element)
    status.say('Not added: a.png')
    expect(status.spoken).toBe(true)
    expect(status.said).toBe('')
    expect(drawn(status)).toBe('<span part="live" role="status"></span>')
    await frame()
    expect(status.said).toBe('Not added: a.png')
    expect(drawn(status)).toBe('<span part="live" role="status">Not added: a.png</span>')
    expect(element.asked).toBe(2)
  })

  test('says the same words twice twice, emptied between', async () => {
    const status = new StatusController(host())
    status.say('Not added: a.png')
    await frame()
    status.say('Not added: a.png')
    expect(status.said).toBe('')
    await frame()
    expect(status.said).toBe('Not added: a.png')
  })

  test('keeps what it says until the new words land, where asked', async () => {
    const element = host()
    const status = new StatusController(element)
    status.say('Saving', { clear: false })
    await frame()
    const asked = element.asked
    status.say('Saving', { clear: false })
    expect(status.said).toBe('Saving')
    await frame()
    expect(element.asked).toBe(asked)
  })

  test('says words at once, in the update that renders it, with sayNow', () => {
    const element = host()
    const status = new StatusController(element)
    status.sayNow('3 suggestions')
    expect(status.said).toBe('3 suggestions')
    expect(element.asked).toBe(1)
    status.sayNow('3 suggestions')
    expect(element.asked).toBe(1)
  })
})
