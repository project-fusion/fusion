import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import type { SpeechEngine, SpeechListener } from '@fusion.dev/helix-core'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../input/index.js')
  await import('../../chat/index.js')
})

/** An engine the spec speaks through: each `listen` hands the spec its listener. */
const fakeEngine = (
  available = true,
): SpeechEngine & { heard: SpeechListener[]; stopped: number } => {
  const engine = {
    available: () => available,
    heard: [] as SpeechListener[],
    listen: ({ listener }: { lang: string; listener: SpeechListener }) => {
      engine.heard.push(listener)
      return {
        stop: () => {
          engine.stopped += 1
          listener.end('stopped')
        },
      }
    },
    stopped: 0,
  }
  return engine
}

type Field = HTMLElement & {
  listening: boolean
  speechEngine: SpeechEngine | undefined
  updateComplete: Promise<boolean>
  value: string
}

const field = async (markup: string, engine = fakeEngine()): Promise<Field> => {
  const element = (await mount(markup)) as Field
  element.speechEngine = engine
  await element.updateComplete
  await element.updateComplete
  return element
}

describe('a textarea with voice', () => {
  test('types each guess at the caret, replaced by the next, and settles on the phrase', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      engine,
    )
    const inputs: string[] = []
    const settled: string[] = []
    element.addEventListener('input', () => inputs.push(element.value))
    element.addEventListener('helix-listen', (event) =>
      settled.push((event as CustomEvent).detail.text),
    )
    ;(part(element, 'voice') as HTMLElement).click()
    await element.updateComplete
    expect(element.listening).toBe(true)
    const [listener] = engine.heard
    listener?.partial('hel')
    listener?.partial('hello')
    listener?.final('Hello there.')
    listener?.partial('and')
    await element.updateComplete
    expect(element.value).toBe('Hello there. and')
    expect(inputs).toEqual(['hel', 'hello', 'Hello there.', 'Hello there. and'])
    expect(settled).toEqual(['Hello there.'])
  })

  test('joins a phrase to the text before the caret with a space, and punctuation with none', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-textarea voice label="Note" value="Note"></helix-headless-textarea>',
      engine,
    )
    const control = part(element, 'control') as HTMLTextAreaElement
    control.setSelectionRange(4, 4)
    ;(element as unknown as { startListening(): boolean }).startListening()
    engine.heard[0]?.final('to self')
    engine.heard[0]?.final(', later')
    await element.updateComplete
    expect(element.value).toBe('Note to self, later')
  })

  test('stops on a second press and on Escape, and says so', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      engine,
    )
    const button = part(element, 'voice') as HTMLElement
    button.click()
    await element.updateComplete
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe('Stop dictation')
    button.click()
    await element.updateComplete
    expect(element.listening).toBe(false)
    expect(part(element, 'voice-status')?.textContent).toBe('Stopped listening')
    button.click()
    await element.updateComplete
    ;(part(element, 'control') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
    )
    await element.updateComplete
    expect(element.listening).toBe(false)
    expect(engine.stopped).toBe(2)
  })

  test('an engine that ends as it starts leaves the field quiet', async () => {
    const engine = fakeEngine()
    const listen = engine.listen
    engine.listen = (request) => {
      const session = listen(request)
      request.listener.end('error', 'not-allowed')
      return session
    }
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      engine,
    )
    expect((element as unknown as { startListening(): boolean }).startListening()).toBe(false)
    await element.updateComplete
    expect(element.listening).toBe(false)
    expect(part(element, 'voice-status')?.textContent).toBe('Dictation needs the microphone')
  })

  test('says it is downloading a language, and why listening failed', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      engine,
    )
    const status = () => part(element, 'voice-status')?.textContent
    ;(element as unknown as { startListening(): boolean }).startListening()
    engine.heard[0]?.preparing?.()
    await element.updateComplete
    expect(status()).toBe('Downloading speech recognition')
    expect(element.listening).toBe(true)

    engine.heard[0]?.end('error', 'network')
    await element.updateComplete
    expect(element.listening).toBe(false)
    expect(status()).toBe('Dictation could not reach the speech service')

    ;(element as unknown as { startListening(): boolean }).startListening()
    engine.heard[1]?.end('error', 'bad-grammar')
    await element.updateComplete
    expect(status()).toBe('Dictation stopped with an error')
  })

  test('listens to nothing when a listener refuses, and draws no button without an engine', async () => {
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
    )
    element.addEventListener('helix-before-listen', (event) => event.preventDefault())
    ;(part(element, 'voice') as HTMLElement).click()
    expect(element.listening).toBe(false)
    const none = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      fakeEngine(false),
    )
    ;(none as unknown as { speechEngine: SpeechEngine }).speechEngine = fakeEngine(false)
    await none.updateComplete
    await none.updateComplete
    expect(part(none, 'voice')).toBeNull()
  })

  test('stops when the reader types or presses in the field, keeping what was heard', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-textarea voice label="Note"></helix-headless-textarea>',
      engine,
    )
    const control = part(element, 'control') as HTMLElement
    const press = (key: string): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
      control.dispatchEvent(event)
      return event
    }
    ;(part(element, 'voice') as HTMLElement).click()
    engine.heard[0]?.partial('draft')
    press('Shift')
    expect(element.listening).toBe(true)
    expect(press('a').defaultPrevented).toBe(false)
    expect(element.listening).toBe(false)
    engine.heard[0]?.partial('lost')
    await element.updateComplete
    expect(element.value).toBe('draft')
    ;(part(element, 'voice') as HTMLElement).click()
    control.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(element.listening).toBe(false)
  })
})

describe('an input with voice', () => {
  test('types what it hears into the value', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-input voice label="Search"></helix-headless-input>',
      engine,
    )
    ;(part(element, 'voice') as HTMLElement).click()
    engine.heard[0]?.final('blue shoes')
    await element.updateComplete
    expect(element.value).toBe('blue shoes')
  })

  test('draws no button on a password, an email or a number', async () => {
    for (const type of ['password', 'email', 'number']) {
      const element = await field(
        `<helix-headless-input voice type="${type}" label="Field"></helix-headless-input>`,
      )
      expect(part(element, 'voice')).toBeNull()
      expect((element as unknown as { startListening(): boolean }).startListening()).toBe(false)
    }
  })
})

describe('a composer with voice', () => {
  test('stops listening when the draft is sent, and sends what was heard', async () => {
    const engine = fakeEngine()
    const element = await field(
      '<helix-headless-chat-composer voice label="Message"></helix-headless-chat-composer>',
      engine,
    )
    const sent: string[] = []
    element.addEventListener('helix-send', (event) =>
      sent.push((event as CustomEvent).detail.value),
    )
    ;(part(element, 'voice') as HTMLElement).click()
    engine.heard[0]?.partial('ship it')
    await element.updateComplete
    ;(element as unknown as { send(): boolean }).send()
    expect(element.listening).toBe(false)
    expect(sent).toEqual(['ship it'])
  })
})
