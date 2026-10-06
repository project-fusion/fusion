import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* happy-dom has no clipboard, so one is installed. That is honest rather than a
   shortcut: what is being asserted is that the button waits for the write and
   reacts to its outcome, and a stub is the only way to make a refusal happen on
   purpose. */
const clipboard = (behavior: 'accept' | 'refuse') => {
  const written: string[] = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string) => {
        if (behavior === 'refuse') {
          return Promise.reject(new Error('denied'))
        }
        written.push(value)
        return Promise.resolve()
      },
    },
  })
  return written
}

/* A press, and everything it sets off.
 *
 * **Not a fixed number of microtask ticks.** Counting them ties the spec to how
 * many `await`s deep the write happens, so a single `await Promise.resolve()`
 * stops reaching the end of it the moment that changes. A press is done when the
 * element has settled, and a task boundary reaches past any number of
 * promises. */
const press = async (el: Updatable): Promise<void> => {
  const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
  button.click()
  await new Promise((done) => setTimeout(done, 0))
  await el.updateComplete
}

describe('copy button', () => {
  test('writes its value and confirms', async () => {
    const written = clipboard('accept')
    const el = await mount(
      '<helix-headless-copy-button value="bun add @fusion.dev/helix"></helix-headless-copy-button>',
    )
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(written).toEqual(['bun add @fusion.dev/helix'])
    expect(button.hasAttribute('data-copied')).toBe(true)
  })

  test('holds the confirmation for feedback-duration, then goes back to its label', async () => {
    clipboard('accept')
    const el = await mount(
      '<helix-headless-copy-button feedback-duration="30" value="one"></helix-headless-copy-button>',
    )
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(button.getAttribute('aria-label')).toBe('Copied')
    await new Promise((done) => setTimeout(done, 60))
    await (el as Updatable).updateComplete
    expect(button.hasAttribute('data-copied')).toBe(false)
    expect(button.getAttribute('aria-label')).toBe('Copy')
  })

  /* The moment after a press was drawn from `data-copied` inside the shadow
     root, which a page's stylesheet cannot reach. The host says it as a state,
     as WA's copy button says `success` and `error`. */
  test('says the confirmation as a state on the host, for as long as it stands', async () => {
    clipboard('accept')
    const el = await mount(
      '<helix-headless-copy-button feedback-duration="30" value="one"></helix-headless-copy-button>',
    )
    expect(hasState(el, 'copied')).toBe(false)
    await press(el)
    expect([hasState(el, 'copied'), hasState(el, 'failed')]).toEqual([true, false])
    await new Promise((done) => setTimeout(done, 60))
    await (el as Updatable).updateComplete
    expect(hasState(el, 'copied')).toBe(false)
  })

  test('announces what it copied, after the write', async () => {
    clipboard('accept')
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    let detail: unknown
    el.addEventListener('helix-copy', (event) => {
      detail = (event as CustomEvent).detail
    })
    await press(el)
    expect(detail).toEqual({ value: 'one' })
  })

  /* The one that matters. A refused clipboard is the common case on an insecure
     origin, and a button that confirms anyway is lying about the one thing it
     exists to report.

     **Both routes have to be refused.** Rejecting `writeText` alone passes under
     happy-dom, which has no `execCommand` at all, and fails in Chromium, where
     `document.execCommand('copy')` succeeds and the button confirms. */
  test('says nothing when the platform refuses', async () => {
    clipboard('refuse')
    ;(document as unknown as Record<string, unknown>).execCommand = () => false
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    let fired = false
    el.addEventListener('helix-copy', () => {
      fired = true
    })
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    delete (document as unknown as Record<string, unknown>).execCommand
    expect(fired).toBe(false)
    expect(button.hasAttribute('data-copied')).toBe(false)
  })
})

describe('what it says and shows', () => {
  test('draws both icons itself, so a bare button is a copy button', async () => {
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const slots = [...(el.shadowRoot?.querySelectorAll('slot') ?? [])]
    /* Read off the slot's own children rather than through
       `assignedNodes({ flatten: true })`. That call is the one that answers
       "what actually renders", and happy-dom returns an empty list for it even
       when the fallback is present and correct: measured here, both slots hold
       an `<svg>` and both report zero. Asserting through it tests the test
       double, and it fails on a component that is right. */
    expect(slots.map((slot) => slot.querySelector('svg') !== null)).toEqual([true, true, true])
  })

  /* The tooltip is the visible confirmation and the accessible name is the
     spoken one. Letting them disagree tells a sighted reader it worked and
     leaves a screen reader user on a button that never acknowledges the press. */
  test('moves its name and its tooltip together', async () => {
    /* Words neither property defaults to. Read against `Copy` and `Copied` this
       passes just as well against a template holding those two literals, which
       is the assertion-that-cannot-fail this repository keeps finding: nothing
       in it is about `label` or `copiedLabel` at all, and a consumer's own
       wording could stop reaching either place with the test still green. */
    clipboard('accept')
    const el = (await mount(
      '<helix-headless-copy-button label="Take it" copied-label="Taken" value="one"></helix-headless-copy-button>',
    )) as Updatable
    const tip = el.shadowRoot?.querySelector('helix-headless-tooltip') as HTMLElement & {
      content: string
    }
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Take it', 'Take it'])
    await press(el)
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Taken', 'Taken'])
  })
})

/**
 * The fallback route, in the place it matters most.
 *
 * `navigator.clipboard.writeText` alone is inert in a sandboxed iframe without
 * `allow-same-origin`, and guarding on the API existing does not help: in that
 * sandbox the object exists and the write rejects. That is the sandbox every
 * example on the docs site runs in, so it is the copy button a reader is most
 * likely to press.
 */
describe('a context that refuses the modern clipboard', () => {
  const legacy = (answers: boolean) => {
    const written: string[] = []
    ;(document as unknown as Record<string, unknown>).execCommand = () => {
      const carrier = document.querySelector('textarea')
      if (carrier) {
        written.push(carrier.value)
      }
      return answers
    }
    return written
  }

  test('copies anyway, and confirms', async () => {
    clipboard('refuse')
    const written = legacy(true)
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(written).toEqual(['one'])
    expect(button.hasAttribute('data-copied')).toBe(true)
    delete (document as unknown as Record<string, unknown>).execCommand
  })

  /* Where neither route is allowed the failure is silence: no confirmation and
     no event. A message about a clipboard is worse than a mark that did not
     flash, and there is nothing a reader could do about a permission policy. */
  test('and says nothing at all where that route is refused too', async () => {
    clipboard('refuse')
    legacy(false)
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    let heard = 0
    el.addEventListener('helix-copy', () => {
      heard += 1
    })
    await press(el)
    expect([button.hasAttribute('data-copied'), heard]).toEqual([false, 0])
    delete (document as unknown as Record<string, unknown>).execCommand
  })
})

describe('a copy button in a row of controls', () => {
  test('gives up its tab stop when the row moves it, the way every other control does', async () => {
    /* This render replaces `Button`'s rather than extending it, so the stop had
       to be carried over by hand and was not: a toolbar wrote `focusable` here,
       the property took the value, and the control went on holding a tab stop
       nothing could move. Two landing places in a row that promises one, with
       the property reading back exactly what the toolbar set. */
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable & { focusable: boolean }
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect(button.hasAttribute('tabindex')).toBe(false)

    el.focusable = false
    await el.updateComplete
    expect(button.getAttribute('tabindex')).toBe('-1')
  })
})

describe('a copy button named on the host', () => {
  /* `aria-label="Copy invite link"` beside `label="Copy link"` was ignored, and
     carried down as it is on Button it would cover "Copied". */
  test('is named by aria-label before a copy, and says Copied after it', async () => {
    clipboard('accept')
    const el = (await mount(
      '<helix-headless-copy-button value="x" label="Copy link" aria-label="Copy invite link"></helix-headless-copy-button>',
    )) as Updatable
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Copy invite link')
    await press(el)
    expect(button.getAttribute('aria-label')).toBe('Copied')
  })
})

/** Mounts a button, presses it, and lists the copy events it sent. */
const failing = async (markup: string): Promise<{ el: Updatable; heard: string[] }> => {
  const el = (await mount(markup)) as Updatable
  const heard: string[] = []
  el.addEventListener('helix-copy', () => heard.push('helix-copy'))
  el.addEventListener('helix-copy-error', () => heard.push('helix-copy-error'))
  await press(el)
  return { el, heard }
}

describe('a press that copies nothing', () => {
  /* Web Awesome names its button with an error label and says so. Before,
     an empty value or a refused write did nothing at all: a reader pressed and
     heard nothing back. */
  test('a refused write names the button with its error label and says so', async () => {
    clipboard('refuse')
    ;(document as unknown as Record<string, unknown>).execCommand = () => false
    const { el, heard } = await failing(
      '<helix-headless-copy-button error-label="Not copied" value="one"></helix-headless-copy-button>',
    )
    delete (document as unknown as Record<string, unknown>).execCommand
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect(heard).toEqual(['helix-copy-error'])
    expect(button.getAttribute('aria-label')).toBe('Not copied')
    expect(button.hasAttribute('data-failed')).toBe(true)
    expect(hasState(el, 'failed')).toBe(true)
    expect(el.shadowRoot?.querySelector('slot[name="failed"]')?.hasAttribute('hidden')).toBe(false)
  })

  test('so does an empty value, on every press', async () => {
    clipboard('accept')
    const { el, heard } = await failing('<helix-headless-copy-button></helix-headless-copy-button>')
    await press(el)
    expect(heard).toEqual(['helix-copy-error', 'helix-copy-error'])
  })
})

describe('copying from another element', () => {
  /* Web Awesome's `from`: an id, then an attribute in brackets or a property
     after a dot. */
  test('copies its text, an attribute or a property, read at the press', async () => {
    const written = clipboard('accept')
    document.body.innerHTML = `<code id="key">sk-123</code><input id="field" value="typed" data-token="t-9">
      <helix-headless-copy-button from="key"></helix-headless-copy-button>
      <helix-headless-copy-button from="field[data-token]"></helix-headless-copy-button>
      <helix-headless-copy-button from="field.value" value="ignored"></helix-headless-copy-button>`
    const buttons = [...document.querySelectorAll('helix-headless-copy-button')] as Updatable[]
    ;(document.getElementById('field') as HTMLInputElement).value = 'edited'
    for (const one of buttons) {
      await one.updateComplete
      await press(one)
    }
    expect(written).toEqual(['sk-123', 't-9', 'edited'])
  })

  test('an element that is not there copies nothing, which is a failed copy', async () => {
    clipboard('accept')
    const { heard } = await failing(
      '<helix-headless-copy-button from="missing" value="one"></helix-headless-copy-button>',
    )
    expect(heard).toEqual(['helix-copy-error'])
  })
})
