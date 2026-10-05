import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { ArrivalController } from './arrival-controller.js'

beforeAll(() => {
  registerDom()
})

/** A host that holds its controllers and counts the updates it was asked for. */
const host = () => {
  const held: ReactiveController[] = []
  const element = {
    addController: (controller: ReactiveController) => held.push(controller),
    asked: 0,
    connect: () => {
      for (const one of held) {
        one.hostConnected?.()
      }
    },
    requestUpdate: () => {
      element.asked += 1
    },
  }
  return element as unknown as ReactiveControllerHost & { asked: number; connect(): void }
}

const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

describe('an element announced when it appears', () => {
  test('arrives saying nothing, and says its words a frame later', async () => {
    /* A region arriving with its words is read inconsistently at best; one
       whose words change is heard. */
    const element = host()
    const words = new ArrivalController(element, { arriving: () => true, text: () => 'No results' })
    element.connect()
    expect(words.said).toBe('')
    await frame()
    expect(words.said).toBe('No results')
    expect(element.asked).toBe(1)
  })

  test('one that came with the page says nothing, its words being no news', () => {
    /* And a region filled at once drew the words twice on the headless tier,
       which has no sheet to clip it, so a served page changed on hydrating. */
    const element = host()
    const words = new ArrivalController(element, {
      arriving: () => false,
      text: () => 'Trial ends',
    })
    element.connect()
    words.say()
    expect(words.said).toBe('')
    expect(element.asked).toBe(0)
  })

  test('new words are said, and the same words are not said again', () => {
    let text = 'One'
    const element = host()
    const words = new ArrivalController(element, { arriving: () => false, text: () => text })
    element.connect()
    words.say()
    expect(words.said).toBe('')
    expect(element.asked).toBe(0)
    text = 'Two'
    words.say()
    expect(words.said).toBe('Two')
    expect(element.asked).toBe(1)
  })
})

/* The words stay in the element itself, so a region that kept its copy put the
   message in the accessibility tree twice for good. */
describe('once the words are said', () => {
  test('the region lets them go after a while, and does not say them again', async () => {
    const element = host()
    const words = new ArrivalController(element, {
      arriving: () => true,
      hold: 10,
      text: () => 'No results',
    })
    element.connect()
    await frame()
    expect(words.said).toBe('No results')
    await new Promise((done) => setTimeout(done, 30))
    expect(words.said).toBe('')
    expect(element.asked).toBe(2)
    words.say()
    expect(words.said).toBe('')
  })
})
