import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The composer, which is one field and one rule about Enter. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Composer extends HTMLElement {
  disabled: boolean
  setCustomValidity?: (message: string) => void
  form: HTMLFormElement | null
  formResetCallback: () => void
  formStateRestoreCallback: (state: string | null) => void
  typing: boolean
  typingTimeout: number
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

describe('the value', () => {
  /* The field fell back to `value` whenever the draft was empty, so a reader
     who deleted a suggested prompt and pressed Enter sent what they deleted. */
  test('a seed the reader cleared is not sent', async () => {
    const element = await composer('value="Seed"')
    expect((part(element, 'field') as HTMLTextAreaElement).value).toBe('Seed')
    await type(element, '')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    expect(element.send()).toBe(false)
    expect(heard).toBe(0)
  })

  /* Typing went into a private draft, so `value` read empty under a whole
     draft and writing it did not replace what was in the field. */
  test('follows typing, and replaces the draft when it is set', async () => {
    const element = await composer()
    let heard = 0
    element.addEventListener('input', () => {
      heard += 1
    })
    await type(element, 'Typed')
    expect(element.value).toBe('Typed')
    expect(heard).toBe(1)
    element.value = ''
    await element.updateComplete
    expect((part(element, 'field') as HTMLTextAreaElement).value).toBe('')
  })

  test('the input a consumer hears comes from the composer', async () => {
    const element = await composer()
    const heard: Array<EventTarget | null> = []
    element.addEventListener('input', (event) => {
      heard.push(event.target)
    })
    await type(element, 'Typed')
    expect(heard.at(-1)).toBe(element)
  })

  /* A document listener in the bubble phase never heard the composer typed
     in, measured in Chromium: the event was sent without `bubbles`. */
  test('and bubbles and is composed, as a native field’s input is', async () => {
    const element = await composer()
    const heard: Array<[EventTarget | null, boolean, boolean]> = []
    const listen = (event: Event): void => {
      heard.push([event.target, event.bubbles, event.composed])
    }
    document.addEventListener('input', listen)
    try {
      await type(element, 'Typed')
    } finally {
      document.removeEventListener('input', listen)
    }
    expect(heard).toEqual([[element, true, true]])
  })
})

describe('Enter', () => {
  test('sends nothing while busy, and leaves the draft', async () => {
    const element = await composer('busy')
    await type(element, 'next')
    let heard = 0
    element.addEventListener('helix-send', () => {
      heard += 1
    })
    press(element, 'Enter')
    expect(heard).toBe(0)
    expect(element.value).toBe('next')
  })

  /* A page that queues a turn, or hands it to the reply under way, takes
     the send while busy, and the button is still the stop button. */
  test('with queue it sends while busy, and the button still stops', async () => {
    const element = await composer('busy queue')
    await type(element, 'next')
    let heard = ''
    element.addEventListener('helix-send', (event) => {
      heard = (event as CustomEvent<{ value: string }>).detail.value
    })
    press(element, 'Enter')
    expect(heard).toBe('next')
    expect(element.value).toBe('')
    expect(part(element, 'send')?.getAttribute('aria-label')).toBe('Stop')
  })

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
   * One row is the wrong shape: an attachment control, the field, a stop
   * control and a send button on one line means every tool a consumer adds
   * takes width from the thing being typed into.
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

  /* The boxes were re-marked only after a render, so a hint a framework
     rendered after the first render stayed hidden for good. */
  test('a tool slotted after the first render is shown', async () => {
    const element = await composer()
    expect((part(element, 'end') as HTMLElement | null)?.hidden).toBe(true)
    const hint = document.createElement('span')
    hint.slot = 'end'
    hint.textContent = 'Enter sends'
    element.append(hint)
    await new Promise((done) => setTimeout(done, 0))
    expect((part(element, 'end') as HTMLElement | null)?.hidden).toBe(false)
  })
})

describe('in a form', () => {
  const inForm = async (attributes = '') => {
    const form = (await mount(
      `<form><helix-headless-chat-composer name="draft" ${attributes}></helix-headless-chat-composer></form>`,
    )) as HTMLFormElement
    const element = form.querySelector('helix-headless-chat-composer') as Composer
    await element.updateComplete
    return element
  }

  /* An empty composer was left out of the form, where a native
     `<textarea name="draft">` submits `draft=`. */
  test('the draft is the value it submits, and an empty one an empty entry', async () => {
    const element = await inForm()
    expect(formValue(element)).toBe('')
    await type(element, 'Where is my order?')
    expect(formValue(element)).toBe('Where is my order?')
    element.send()
    await element.updateComplete
    expect(formValue(element)).toBe('')
  })

  test('a reset puts back the draft the markup declared', async () => {
    const element = await inForm('value="Hello"')
    await type(element, 'Something else')
    element.formResetCallback()
    await element.updateComplete
    expect(element.value).toBe('Hello')
    expect((part(element, 'field') as HTMLTextAreaElement).value).toBe('Hello')
  })

  /* The state was left out, so a draft the reader emptied had none, and a
     restore brought back the declared draft they had deleted. */
  test('saves the draft as its state, an emptied one too', async () => {
    const element = await inForm('value="Hello"')
    const internals = (element as unknown as { internals: ElementInternals }).internals
    const saved: unknown[] = []
    const report = internals.setFormValue.bind(internals)
    internals.setFormValue = (value, state) => {
      saved.push(state)
      report(value, state)
    }
    await type(element, 'Kept')
    await type(element, '')
    expect(saved).toEqual(['Kept', ''])
    expect(formValue(element)).toBe('')
    element.formStateRestoreCallback(saved.at(-1) as string)
    expect(element.value).toBe('')
  })

  test('a restore brings the draft back, and an empty one the declared draft', async () => {
    const element = await inForm('value="Hello"')
    element.formStateRestoreCallback('Kept')
    expect(element.value).toBe('Kept')
    element.formStateRestoreCallback(null)
    expect(element.value).toBe('Hello')
  })
})

/* The composer took a value and none of a field's constraints, so a form
   could not require a message or bound its length. */
describe('constraints', () => {
  type Checked = Composer & { checkValidity: () => boolean; validity: ValidityState }

  test('a required composer is invalid while empty, and says so only once tried', async () => {
    const element = (await composer('required')) as Checked
    const field = part(element, 'field') as HTMLTextAreaElement
    expect(field.required).toBe(true)
    expect(element.validity.valueMissing).toBe(true)
    expect(hasState(element, 'invalid')).toBe(false)
    expect(field.hasAttribute('aria-invalid')).toBe(false)
    /* The host is a group with a role, and a host with no `aria-invalid` is
       judged by its validity: Chromium exposed the untouched composer as
       invalid on load. */
    const internals = (element as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaInvalid).toBe('false')

    /* What a form's submission sends to a control that fails. */
    element.dispatchEvent(new Event('invalid'))
    await element.updateComplete
    await element.updateComplete
    expect(hasState(element, 'invalid')).toBe(true)
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(internals.ariaInvalid).toBe('true')

    await type(element, 'hello')
    await element.updateComplete
    expect(element.validity.valid).toBe(true)
    expect(hasState(element, 'invalid')).toBe(false)
  })

  /* Enter on an empty required composer sent nothing and said nothing, so a
     reader could not tell the field wanted text. */
  test('a required composer sent empty says it is wrong, and sends nothing', async () => {
    const element = (await composer('required')) as Checked
    const heard: unknown[] = []
    element.addEventListener('helix-send', (event) => heard.push(event))
    press(element, 'Enter')
    await element.updateComplete
    await element.updateComplete
    expect(heard).toEqual([])
    expect(hasState(element, 'invalid')).toBe(true)
    expect(part(element, 'field')?.getAttribute('aria-invalid')).toBe('true')
    /* One that is not required is simply not sent. */
    const optional = (await composer()) as Checked
    press(optional, 'Enter')
    await optional.updateComplete
    expect(hasState(optional, 'invalid')).toBe(false)
  })

  test('the lengths reach the field, and a draft that fails them does not send', async () => {
    const element = (await composer('minlength="3" maxlength="20"')) as Checked
    const field = part(element, 'field') as HTMLTextAreaElement
    expect(field.getAttribute('minlength')).toBe('3')
    expect(field.getAttribute('maxlength')).toBe('20')

    let sent = 0
    element.addEventListener('helix-send', () => {
      sent += 1
    })
    await type(element, 'hi')
    element.setCustomValidity?.('Too short')
    await element.updateComplete
    expect(element.send()).toBe(false)
    expect(sent).toBe(0)
    await element.updateComplete
    await element.updateComplete
    expect(hasState(element, 'invalid')).toBe(true)

    element.setCustomValidity?.('')
    await type(element, 'hello')
    expect(element.send()).toBe(true)
    expect(sent).toBe(1)
  })

  /* Measured in Chromium before this: a required composer sent "hi", cleared
     itself, and on Tab showed itself invalid, because the field sends `change`
     as it is left whenever its text differs from what it held on focus. */
  test('a required composer cleared by its own send stays unmarked when left', async () => {
    const element = (await composer('required')) as Checked
    const field = part(element, 'field') as HTMLTextAreaElement
    await type(element, 'hi')
    press(element, 'Enter')
    await element.updateComplete
    expect(element.value).toBe('')
    field.dispatchEvent(new Event('change'))
    await element.updateComplete
    await element.updateComplete
    expect(hasState(element, 'invalid')).toBe(false)
    expect(field.hasAttribute('aria-invalid')).toBe(false)
  })

  test('and one the reader emptied by hand is marked when left', async () => {
    const element = (await composer('required')) as Checked
    const field = part(element, 'field') as HTMLTextAreaElement
    await type(element, 'hi')
    await type(element, '')
    field.dispatchEvent(new Event('change'))
    await element.updateComplete
    await element.updateComplete
    expect(hasState(element, 'invalid')).toBe(true)
  })

  /* Every field takes `feedback`, and the composer took only
     `setCustomValidity`, which a template cannot write. */
  test('feedback marks the composer at once, says why, and stops the send', async () => {
    const element = (await composer('feedback="That model is busy."')) as Checked & {
      feedback: string
    }
    await element.updateComplete
    await element.updateComplete
    const field = part(element, 'field') as HTMLTextAreaElement
    const message = part(element, 'feedback') as HTMLElement
    expect(message.textContent?.trim()).toBe('That model is busy.')
    expect(message.getAttribute('role')).toBe('alert')
    expect(field.getAttribute('aria-describedby')).toBe('feedback')
    expect(hasState(element, 'invalid')).toBe(true)
    expect(element.validity.customError).toBe(true)
    let sent = 0
    element.addEventListener('helix-send', () => {
      sent += 1
    })
    await type(element, 'hello')
    expect(element.send()).toBe(false)
    expect(sent).toBe(0)
    element.feedback = ''
    await element.updateComplete
    await element.updateComplete
    expect(part(element, 'feedback')).toBeNull()
    expect(hasState(element, 'invalid')).toBe(false)
    expect(element.send()).toBe(true)
  })

  test('a reset takes the mark away', async () => {
    const element = (await composer('required')) as Checked
    element.dispatchEvent(new Event('invalid'))
    await element.updateComplete
    await element.updateComplete
    element.formResetCallback()
    await element.updateComplete
    await element.updateComplete
    expect(hasState(element, 'invalid')).toBe(false)
  })
})

describe('typing', () => {
  test('starting to write says so once, and sending says it stopped', async () => {
    const element = await composer()
    const heard: boolean[] = []
    element.addEventListener('helix-typing', (event) => {
      // The event carries the same answer the composer holds.
      expect((event as CustomEvent<{ typing: boolean }>).detail.typing).toBe(element.typing)
      heard.push(element.typing)
    })
    await type(element, 'H')
    await type(element, 'He')
    expect(heard).toEqual([true])
    element.send()
    expect(heard).toEqual([true, false])
  })

  test('a pause of the timeout says it stopped', async () => {
    const element = await composer('typing-timeout="10"')
    const heard: boolean[] = []
    element.addEventListener('helix-typing', () => heard.push(element.typing))
    await type(element, 'Hello')
    await new Promise((resolve) => {
      setTimeout(resolve, 30)
    })
    expect(heard).toEqual([true, false])
    expect(element.typing).toBe(false)
  })

  test('clearing the field says it stopped', async () => {
    const element = await composer()
    await type(element, 'Hello')
    await type(element, '')
    expect(element.typing).toBe(false)
  })

  test('it bubbles, so the chat around the composer hears it', async () => {
    const element = await composer()
    let heard = 0
    const hear = (): void => {
      heard += 1
    }
    document.body.addEventListener('helix-typing', hear)
    try {
      await type(element, 'Hi')
    } finally {
      document.body.removeEventListener('helix-typing', hear)
    }
    expect(heard).toBeGreaterThan(0)
  })
})

describe('a busy composer', () => {
  test('turns its send button into a stop button that sends helix-stop', async () => {
    const element = await composer('busy')
    const button = part(element, 'send') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Stop')
    let stopped = 0
    element.addEventListener('helix-stop', () => {
      stopped += 1
    })
    button.click()
    expect(stopped).toBe(1)
  })

  test('keeps the draft and sends nothing until it is not busy', async () => {
    const element = await composer('busy')
    let sent = 0
    element.addEventListener('helix-send', () => {
      sent += 1
    })
    await type(element, 'next turn')
    press(element, 'Enter')
    expect([sent, element.value, element.send()]).toEqual([0, 'next turn', false])
    element.removeAttribute('busy')
    await element.updateComplete
    expect((part(element, 'send') as HTMLButtonElement).getAttribute('aria-label')).toBe('Send')
    expect(element.send()).toBe(true)
    expect(sent).toBe(1)
  })
})
