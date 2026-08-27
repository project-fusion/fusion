import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

/* The composer, which is one field and one rule about Enter. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Composer extends HTMLElement {
  disabled: boolean
  send: () => boolean
  submitOn: 'button' | 'enter'
  updateComplete: Promise<unknown>
  value: string
}

const composer = async (attributes = '') => {
  const element = (await mount(
    `<helix-headless-chat-composer ${attributes}></helix-headless-chat-composer>`,
  )) as Composer
  await element.updateComplete
  return element
}

const type = async (element: Composer, text: string) => {
  const field = part(element, 'field') as HTMLTextAreaElement
  field.value = text
  field.dispatchEvent(new Event('input', { bubbles: true }))
  await element.updateComplete
  return field
}

const press = (element: Composer, key: string, options: KeyboardEventInit = {}) => {
  const field = part(element, 'field') as HTMLTextAreaElement
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...options })
  field.dispatchEvent(event)
  return event
}

describe('sending', () => {
  test('what the reader wrote is what is offered', async () => {
    const element = await composer()
    await type(element, '  hello  ')
    const seen: string[] = []
    element.addEventListener('helix-send', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    expect(element.send()).toBe(true)
    expect(seen).toEqual(['hello'])
  })

  test('an empty field offers nothing', async () => {
    const element = await composer()
    await type(element, '   ')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    expect(element.send()).toBe(false)
    expect(heard).toBe(0)
  })

  test('a disabled composer offers nothing', async () => {
    const element = await composer('disabled')
    await type(element, 'hello')
    expect(element.send()).toBe(false)
  })

  /**
   * A composer that empties itself and then hears the request failed has thrown
   * away the only copy of what the reader wrote, and a reader who has just
   * written three paragraphs is exactly who cannot afford that.
   */
  test('a refused send leaves the text where it is', async () => {
    const element = await composer()
    await type(element, 'three paragraphs')
    element.addEventListener('helix-send', (event) => event.preventDefault())
    expect(element.send()).toBe(false)
    await element.updateComplete
    expect((part(element, 'field') as HTMLTextAreaElement).value).toBe('three paragraphs')
  })

  test('an accepted send clears it', async () => {
    const element = await composer()
    await type(element, 'sent')
    element.send()
    await element.updateComplete
    expect(element.value).toBe('')
    expect((part(element, 'field') as HTMLTextAreaElement).value).toBe('')
  })
})

describe('Enter', () => {
  test('sends, and takes the keystroke with it', async () => {
    const element = await composer()
    await type(element, 'hello')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    const event = press(element, 'Enter')
    expect(heard).toBe(1)
    expect(event.defaultPrevented).toBe(true)
  })

  test('with Shift it opens a line instead', async () => {
    const element = await composer()
    await type(element, 'hello')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    const event = press(element, 'Enter', { shiftKey: true })
    expect(heard).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  /**
   * **The condition that breaks a whole writing system when it is left out.** A
   * reader typing Japanese, Chinese or Korean presses Enter to accept the
   * candidate their input method is offering. Read as send, that fires off a
   * half-finished word every single time.
   */
  test('never sends mid-composition, which is how an input method accepts a candidate', async () => {
    const element = await composer()
    await type(element, 'にほん')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    press(element, 'Enter', { isComposing: true } as KeyboardEventInit)
    expect(heard).toBe(0)
  })

  test('`submit-on="button"` leaves Enter to the field', async () => {
    const element = await composer('submit-on="button"')
    await type(element, 'a long thing')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    const event = press(element, 'Enter')
    expect(heard).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  test('the control still sends when Enter does not', async () => {
    const element = await composer('submit-on="button"')
    await type(element, 'a long thing')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    ;(part(element, 'send') as HTMLElement).click()
    expect(heard).toBe(1)
  })
})

describe('the shape of the composer', () => {
  /**
   * The field spans the composer and the tools sit under it.
   *
   * One row was the wrong shape: an attachment control, the field, a stop
   * control and a send button all on one line meant every tool a consumer added
   * took width from the thing being typed into.
   */
  test('the tools are under the field, not beside it', async () => {
    const element = await composer()
    const tools = part(element, 'tools')
    expect(tools).not.toBeNull()
    expect(tools?.querySelector('[part="start"]')).not.toBeNull()
    expect(tools?.querySelector('[part="end"]')).not.toBeNull()
    expect(tools?.querySelector('[part="send"]')).not.toBeNull()
  })

  /**
   * The send control is a glyph with the label as its accessible name, so a
   * screen reader hears the same word it always did while the composer stops
   * spending its widest column on it.
   */
  test('send is marked rather than spelled, and keeps its name', async () => {
    const element = await composer('send-label="Send message"')
    const send = part(element, 'send')
    expect(send?.getAttribute('aria-label')).toBe('Send message')
    expect(send?.querySelector('[part="mark"]')).not.toBeNull()
  })

  /**
   * A tool box nobody filled is not laid out: it is a flex item, so it takes the
   * gap beside it and the send control drifts inward for every slot a consumer
   * left alone.
   */
  test('an empty tool box is hidden and a filled one is not', async () => {
    const bare = await composer()
    expect(part(bare, 'start')?.hasAttribute('data-empty')).toBe(true)
    const filled = (await mount(
      `<helix-headless-chat-composer><button slot="start">Attach</button></helix-headless-chat-composer>`,
    )) as Composer
    await filled.updateComplete
    expect(part(filled, 'start')?.hasAttribute('data-empty')).toBe(false)
  })
})
