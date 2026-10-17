import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
} from '@fusion.dev/helix-testing/dom'

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

describe('send-disabled', () => {
  test('keeps the draft, takes the send button away, and leaves the field open', async () => {
    const element = await composer('send-disabled')
    let sent = 0
    element.addEventListener('helix-send', () => {
      sent += 1
    })
    await type(element, 'with a photo')
    press(element, 'Enter')
    const button = part(element, 'send') as HTMLButtonElement
    const field = part(element, 'field') as HTMLTextAreaElement
    expect([sent, element.value, element.send()]).toEqual([0, 'with a photo', false])
    expect([button.disabled, field.disabled]).toEqual([true, false])
    element.removeAttribute('send-disabled')
    await element.updateComplete
    expect(button.disabled).toBe(false)
    expect(element.send()).toBe(true)
    expect(sent).toBe(1)
  })

  test('with a reason, the button stays reachable and its tooltip says why', async () => {
    const element = await composer('send-disabled send-reason="Reading photo.jpg"')
    let sent = 0
    element.addEventListener('helix-send', () => {
      sent += 1
    })
    await type(element, 'with a photo')
    const button = part(element, 'send') as HTMLButtonElement
    const tooltip = element.shadowRoot?.querySelector('#send-reason')
    button.click()
    expect([sent, element.value]).toEqual([0, 'with a photo'])
    expect([button.disabled, button.getAttribute('aria-disabled')]).toEqual([false, 'true'])
    expect(button.getAttribute('aria-describedby')).toBe('send-reason')
    expect(tooltip?.getAttribute('content')).toBe('Reading photo.jpg')
    button.focus()
    expect(element.shadowRoot?.activeElement).toBe(button)
  })

  test('the reason goes once the draft is free to send', async () => {
    const element = await composer('send-disabled send-reason="Reading photo.jpg"')
    element.removeAttribute('send-disabled')
    await element.updateComplete
    const button = part(element, 'send') as HTMLButtonElement
    expect(element.shadowRoot?.querySelector('#send-reason')).toBeNull()
    expect([button.disabled, button.hasAttribute('aria-disabled')]).toEqual([false, false])
  })

  test('leaves the stop button working while busy', async () => {
    const element = await composer('busy queue send-disabled')
    const button = part(element, 'send') as HTMLButtonElement
    let stopped = 0
    element.addEventListener('helix-stop', () => {
      stopped += 1
    })
    await type(element, 'queued')
    expect(element.send()).toBe(false)
    button.click()
    expect([button.disabled, stopped]).toEqual([false, 1])
  })
})

/* A start page's composer shows the kinds of thing to ask, one after another,
   as its placeholder, and keeps still while the reader is about to write. */
describe('placeholders', () => {
  const field = (host: HTMLElement) => part(host, 'field') as HTMLTextAreaElement

  test('the first example is the placeholder, and `placeholder` stands in for none', async () => {
    const host = (await composer('placeholder="Write a message"')) as Composer & {
      placeholders: string[]
    }
    expect(field(host).placeholder).toBe('Write a message')
    host.placeholders = ['Fix the failing test', 'Explain the auth flow']
    await host.updateComplete
    expect(field(host).placeholder).toBe('Fix the failing test')
  })

  const wait = (milliseconds: number) => new Promise((done) => setTimeout(done, milliseconds))

  /* Stands in for the platform's observer, so a spec can say when each
     composer comes into view and goes out of it. */
  const watchSight = () => {
    const sights = new Map<Element, (seen: boolean) => void>()
    const real = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(private readonly heard: IntersectionObserverCallback) {}
      disconnect(): void {}
      observe(target: Element): void {
        sights.set(target, (seen) =>
          this.heard(
            [{ isIntersecting: seen, target } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        )
      }
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
      unobserve(): void {}
    } as unknown as typeof IntersectionObserver
    return {
      restore: () => {
        globalThis.IntersectionObserver = real
      },
      see: (target: Element, seen: boolean) => sights.get(target)?.(seen),
    }
  }

  /* **The turns wait real time, about 17 seconds between them, so they run
     under happy-dom alone.** The timing is the element's logic and reads the
     same in any engine, and the browser run of a family has 60 seconds in
     all. The styled spec waits out one real turn in each browser. */
  const timed = hasLayout() ? (..._skipped: unknown[]): void => {} : test

  const statesOf = (host: Composer) => [
    field(host).placeholder,
    hasState(host, 'example-leaving'),
    hasState(host, 'example-entering'),
  ]

  /* One turn is the example's time, 6.5 seconds for a short one, then a
     250 millisecond exit, with the next example arriving 100 milliseconds
     in and entering for 350. The composers held by focus, by text and by
     being out of view wait out the same turn beside it, and the one that
     comes back into view at 3 seconds gets its full time from there. */
  timed(
    'an empty field in view and without focus rolls to the next example, and focus, text, or being out of view holds it',
    async () => {
      const sight = watchSight()
      try {
        const names = ['moving', 'focused', 'written', 'hidden', 'returned']
        await mount(
          names
            .map((id) => `<helix-headless-chat-composer id="${id}"></helix-headless-chat-composer>`)
            .join(''),
        )
        const [moving, focused, written, hidden, returned] = [
          ...document.querySelectorAll('helix-headless-chat-composer'),
        ] as (Composer & {
          placeholders: string[]
        })[]
        for (const host of [moving, focused, written, hidden, returned]) {
          await host.updateComplete
          host.placeholders = ['One', 'Two']
          await host.updateComplete
        }
        field(focused).dispatchEvent(new FocusEvent('focus'))
        await type(written, 'Draft')
        sight.see(hidden, false)
        sight.see(returned, false)
        await wait(3000)
        sight.see(returned, true)
        await wait(3400)
        expect(statesOf(moving)).toEqual(['One', false, false])
        await wait(150)
        expect(statesOf(moving)).toEqual(['One', true, false])
        await wait(100)
        await moving.updateComplete
        // The two cross: the next is the placeholder while the first still leaves.
        expect(statesOf(moving)).toEqual(['Two', true, true])
        await wait(200)
        expect(statesOf(moving)).toEqual(['Two', false, true])
        await wait(250)
        expect(statesOf(moving)).toEqual(['Two', false, false])
        for (const host of [focused, written, hidden, returned]) {
          expect(statesOf(host)).toEqual(['One', false, false])
        }
        await wait(2700)
        await returned.updateComplete
        expect(field(returned).placeholder).toBe('Two')
        expect(statesOf(hidden)).toEqual(['One', false, false])
        for (const host of [moving, focused, written, hidden, returned]) {
          host.remove()
        }
      } finally {
        sight.restore()
      }
    },
    15000,
  )

  /* The field's placeholder is the example showing, so the field is what a
     screen reader reaches and the empty-field semantics are the field's. */
  test('the field keeps the example showing as its placeholder', async () => {
    const host = (await composer('label="Ask anything"')) as Composer & { placeholders: string[] }
    host.placeholders = ['One', 'Two']
    await host.updateComplete
    expect(field(host).placeholder).toBe('One')
    expect(field(host).getAttribute('aria-label')).toBe('Ask anything')
    host.remove()
  })

  test('the headless tier draws no example over the field', async () => {
    const host = (await composer()) as Composer & { placeholders: string[] }
    host.placeholders = ['One', 'Two']
    await host.updateComplete
    expect(part(host, 'example')).toBeNull()
    expect(host.shadowRoot?.querySelectorAll('textarea')).toHaveLength(1)
    host.remove()
  })

  /* A paused page holds every motion that starts by itself, as reduced motion
     does, which happy-dom cannot ask for. */
  timed(
    'a page that paused its motion keeps the first example',
    async () => {
      document.documentElement.setAttribute('data-helix-motion', 'paused')
      try {
        const host = (await composer()) as Composer & { placeholders: string[] }
        host.placeholders = ['One', 'Two']
        await host.updateComplete
        await wait(6900)
        await host.updateComplete
        expect([
          field(host).placeholder,
          hasState(host, 'example-leaving'),
          hasState(host, 'example-entering'),
        ]).toEqual(['One', false, false])
        host.remove()
      } finally {
        document.documentElement.removeAttribute('data-helix-motion')
      }
    },
    12000,
  )
})

describe('the idle slot', () => {
  const withIdle = async (attributes = '') => {
    const element = (await mount(
      `<helix-headless-chat-composer ${attributes}><button slot="idle">Start voice mode</button></helix-headless-chat-composer>`,
    )) as Composer & { attached: boolean; busy: boolean }
    await element.updateComplete
    // The slot learns what it holds as its contents arrive.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await element.updateComplete
    return element
  }
  const showing = (element: HTMLElement) => ({
    idle: !part(element, 'idle')?.hasAttribute('hidden'),
    send: part(element, 'send') !== null,
  })

  test('takes the send button’s place while the draft is empty', async () => {
    const element = await withIdle()
    expect(showing(element)).toEqual({ idle: true, send: false })

    element.value = 'Hello'
    await element.updateComplete
    expect(showing(element)).toEqual({ idle: false, send: true })
  })

  test('gives way to the send button while a file is attached, and to stop while busy', async () => {
    const element = await withIdle()
    element.attached = true
    await element.updateComplete
    expect(showing(element)).toEqual({ idle: false, send: true })

    element.attached = false
    element.busy = true
    await element.updateComplete
    expect(showing(element)).toEqual({ idle: false, send: true })
    expect(part(element, 'send')?.getAttribute('aria-label')).toBe('Stop')
  })

  test('a composer with nothing in the slot always shows the send button', async () => {
    const element = await composer()
    expect(part(element, 'send')).not.toBeNull()
    expect(part(element, 'idle')?.hasAttribute('hidden')).toBe(true)
  })

  test('focus on the idle control moves to the send button when it comes', async () => {
    const element = await withIdle()
    const idle = element.querySelector('button') as HTMLButtonElement
    idle.focus()

    element.attached = true
    await element.updateComplete

    expect(element.shadowRoot?.activeElement).toBe(part(element, 'send'))
  })
})

describe('the attachments slot', () => {
  const carrying = async () => {
    const element = (await mount(
      `<helix-headless-chat-composer><span slot="attachments"><img alt="photo.jpg" src="data:," /><button type="button">Remove photo.jpg</button></span></helix-headless-chat-composer>`,
    )) as Composer
    await element.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    return element
  }

  /* Inside the box and before the field, so what the draft carries reads as
     part of the draft, the way a message's own attachments sit with it. */
  test('sits inside the box, above the field', async () => {
    const element = await carrying()
    const box = part(element, 'composer') as HTMLElement
    const region = part(element, 'attachments')
    expect(region?.parentElement).toBe(box)
    expect(region?.nextElementSibling).toBe(part(element, 'field'))
    expect(region?.querySelector('slot[name="attachments"]')).not.toBeNull()
  })

  test('is shown while something is in it', async () => {
    const element = await carrying()
    const region = part(element, 'attachments') as HTMLElement
    expect(region.hidden).toBe(false)
    expect(region.hasAttribute('data-empty')).toBe(false)
  })

  /* An empty region is a grid row, and a row takes the gap above the field. */
  test('takes no room while nothing is in it', async () => {
    const element = await composer()
    const region = part(element, 'attachments') as HTMLElement
    expect(region.hidden).toBe(true)
    expect(region.hasAttribute('data-empty')).toBe(true)
  })

  test('shows and hides as attachments come and go after the first render', async () => {
    const element = await composer()
    const region = part(element, 'attachments') as HTMLElement
    const chip = document.createElement('span')
    chip.slot = 'attachments'
    chip.textContent = 'notes.md'
    element.append(chip)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(region.hidden).toBe(false)

    chip.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(region.hidden).toBe(true)

    // A render after the attachments left keeps the region hidden.
    element.value = 'Hello'
    await element.updateComplete
    expect(region.hidden).toBe(true)
  })

  /* A press between two thumbnails would otherwise take focus off the
     field, and the next key the reader pressed would be typed nowhere. The
     gap between them is the region itself. */
  test('a press on its empty space keeps the reader in the field', async () => {
    const element = await carrying()
    const field = part(element, 'field') as HTMLTextAreaElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true })
    part(element, 'attachments')?.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    expect(element.shadowRoot?.activeElement).toBe(field)
  })

  /* happy-dom routes no event from a slotted node through its slot, so the
     press is sent to the region with the path a browser gives it: the
     button, the chip around it, the slot, and the region. */
  test('a press on a control in it is left to the control', async () => {
    const element = await carrying()
    const region = part(element, 'attachments') as HTMLElement
    const remove = element.querySelector('button') as HTMLButtonElement
    const chip = remove.parentElement as HTMLElement
    const slot = region.querySelector('slot') as HTMLSlotElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true })
    Object.defineProperty(press, 'composedPath', {
      value: () => [remove, chip, slot, region, part(element, 'composer'), element],
    })
    region.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(false)
  })
})
