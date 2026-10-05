import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasState,
  mount,
  part,
  registerDom,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../icon-button/index.js')
})

/** What the console was warned while `markup` mounted and settled, with nothing printed. */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await mount(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

const control = (host: HTMLElement): Element | null => part(host, 'button')

describe('button control', () => {
  test('is always a button, never an anchor', async () => {
    // A router renders its own anchor and cannot render it inside this shadow
    // root, so a button that could also be a link forced every such navigation
    // to be a full page load. A link that looks like a button is the
    // `data-button` recipe in the base layer instead.
    const button = await mount('<helix-headless-button>Go</helix-headless-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    expect(button.shadowRoot?.querySelector('a')).toBeNull()
  })

  test('is a real button, not a div with a role', async () => {
    const button = await mount('<helix-headless-button>Go</helix-headless-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    // Always `button`, never `submit`: a submit inside a shadow root has no
    // form to submit, so submission is handled explicitly instead.
    expect(control(button)?.getAttribute('type')).toBe('button')
  })

  test('a disabled button takes the native attribute', async () => {
    const button = await mount('<helix-headless-button disabled>X</helix-headless-button>')
    expect((control(button) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('button form participation', () => {
  test('finds the form it is inside without a form attribute', async () => {
    document.body.innerHTML =
      '<form><helix-headless-button type="submit">Send</helix-headless-button></form>'
    const button = document.querySelector('helix-headless-button') as Updatable & {
      form: HTMLFormElement
    }
    await button.updateComplete
    expect(button.form?.tagName).toBe('FORM')
  })

  test('submitting routes through the form, across the shadow boundary', async () => {
    document.body.innerHTML =
      '<form><helix-headless-button type="submit">Send</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete

    let submitted = 0
    // `requestSubmit` runs validation; `submit` skips it. Which one is called
    // is the whole point of handling submission by hand.
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(1)
  })

  test('a plain button leaves its form alone', async () => {
    document.body.innerHTML = '<form><helix-headless-button>Nothing</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete

    let submitted = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(0)
  })
})

/* The five submission overrides, and the one window they are true in.
 *
 * `requestSubmit(submitter)` refuses this control twice over, so the overrides
 * are written onto the form, the submission is started, and they are put back
 * inside one synchronous call. Everything about that is invisible from outside:
 * the properties read back whatever was set whether or not they ever reach the
 * form, and the form looks untouched before and after. What a `submit` handler
 * sees during the call is the whole of the behavior, so that is where these
 * read. */
describe('button submission overrides', () => {
  const submitter = async (
    attributes: string,
  ): Promise<{ button: Updatable; during: Record<string, string | null> }> => {
    document.body.innerHTML = `<form action="/base" method="get"><helix-headless-button type="submit" ${attributes}>Send</helix-headless-button></form>`
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete

    const during: Record<string, string | null> = {}
    form.requestSubmit = () => {
      for (const name of ['action', 'enctype', 'method', 'novalidate', 'target']) {
        during[name] = form.getAttribute(name)
      }
    }
    ;(control(button) as HTMLElement).click()
    return { button, during }
  }

  test('each override is on the form for the submission it starts', async () => {
    const { during } = await submitter(
      'formaction="/elsewhere" formenctype="multipart/form-data" formmethod="post" formnovalidate formtarget="_blank"',
    )
    expect(during.action).toBe('/elsewhere')
    expect(during.enctype).toBe('multipart/form-data')
    expect(during.method).toBe('post')
    expect(during.novalidate).toBe('')
    expect(during.target).toBe('_blank')
  })

  test('and the form is exactly as it was afterwards', async () => {
    /* The overrides belong to one press. A form left holding them would send
       the next submission, started by anything at all, to the destination this
       button alone asked for. */
    await submitter('formaction="/elsewhere" formmethod="post" formnovalidate formtarget="_blank"')
    const form = document.querySelector('form') as HTMLFormElement
    expect(form.getAttribute('action')).toBe('/base')
    expect(form.getAttribute('method')).toBe('get')
    expect(form.hasAttribute('novalidate')).toBe(false)
    expect(form.hasAttribute('target')).toBe(false)
  })

  test('a button that overrides nothing leaves the form saying what it said', async () => {
    // An override written at its empty default would send every submission to
    // `action=""`, which is the current page.
    const { during } = await submitter('')
    expect(during.action).toBe('/base')
    expect(during.method).toBe('get')
    expect(during.novalidate).toBe(null)
    expect(during.target).toBe(null)
  })

  test('a named button reports its value for its own submission and clears it', async () => {
    /* What a native submitter contributes, and the reason this cannot be a
       standing report: a form-associated element that reported continuously
       would contribute `name=value` on every submission whoever started it,
       which is a different feature wearing the same name. */
    const { button, during } = await submitter('name="action" value="publish"')
    expect(during.action).toBe('/base')
    expect(formValue(button)).toBe(null)
  })

  test('an unnamed button contributes nothing at all, the way a native one does not', async () => {
    const { button } = await submitter('value="publish"')
    expect(formValue(button)).toBe(undefined)
  })
})

/* The two properties a parent writes and a consumer never does.
 *
 * Both are `attribute: false`, which is the point: a toolbar moving the tab
 * stop and a disclosure reporting its panel are coordination between elements,
 * and writing either as an attribute onto markup a consumer served is a
 * hydration mismatch React reports and does not patch up. So the state travels
 * to the inner control inside this shadow root, and reading it back is the only
 * way to tell the property from a no-op. */
describe('button coordination properties', () => {
  test('the tab stop moves into the shadow root rather than onto the host', async () => {
    /* A toolbar keeps one stop across its children by setting this. Dropped,
       every control in the row is a stop and the keyboard walks all of them. */
    const button = (await mount(
      '<helix-headless-button>Go</helix-headless-button>',
    )) as Updatable & {
      focusable: boolean
    }
    expect(control(button)?.hasAttribute('tabindex')).toBe(false)
    expect(button.hasAttribute('tabindex')).toBe(false)

    button.focusable = false
    await button.updateComplete
    expect(control(button)?.getAttribute('tabindex')).toBe('-1')
    expect(button.hasAttribute('tabindex')).toBe(false)
  })

  test('a trigger says whether its panel is open, and says nothing when it is not one', async () => {
    /* `undefined` renders no attribute at all, which is what a button that is
       not a disclosure owes a screen reader: `aria-expanded="false"` on an
       ordinary button announces a collapsed thing that does not exist. */
    const button = (await mount(
      '<helix-headless-button>Go</helix-headless-button>',
    )) as Updatable & {
      expanded?: boolean
    }
    expect(control(button)?.hasAttribute('aria-expanded')).toBe(false)

    button.expanded = false
    await button.updateComplete
    expect(control(button)?.getAttribute('aria-expanded')).toBe('false')

    button.expanded = true
    await button.updateComplete
    expect(control(button)?.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('button invokers', () => {
  /* **A target that arrives after the button rendered still gets the command.**
   *
   * Linking the command from `updated` alone resolves the target once and never
   * again, and a button whose properties do not change does not update again: one
   * rendered before its target existed stays wired to nothing permanently.
   * Measured that way, `commandForElement` read null with the target absent, null
   * again after it was inserted, and resolved only when an unrelated property
   * forced an update.
   *
   * **The environment decides which half of the component this exercises**, and
   * both halves are worth having. Under happy-dom there are no invokers, so this
   * is `sendCommand` and its live lookup, which was always correct. In the
   * browser suite it is the native path, which was the broken one. The assertion
   * is the same either way because the fallback event is named `command` to
   * match the platform's. */
  test('a command reaches a target inserted after the button rendered', async () => {
    const button = await mount(
      '<helix-headless-button command="--go" commandfor="late">Go</helix-headless-button>',
    )

    const target = document.createElement('div')
    target.id = 'late'
    document.body.append(target)

    let received: string | null = null
    target.addEventListener('command', (event) => {
      received = (event as Event & { command?: string }).command ?? null
    })

    ;(control(button) as HTMLElement).click()
    expect<string | null>(received).toBe('--go')
  })
})

describe('button as its form’s default button', () => {
  /* The platform cannot see a submit button in a shadow root, so a form whose
     only submit button was this one had no default button, and Enter in either
     of two fields did nothing. happy-dom leaves a custom element out of
     `form.elements`, which a browser does not, so the list is supplied. */
  test('is pressed by Enter in a native field of its form', async () => {
    document.body.innerHTML =
      '<form><input name="a" /><input name="b" /><helix-headless-button type="submit" name="act" value="save">Save</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete
    Object.defineProperty(form, 'elements', { value: [...form.querySelectorAll('input'), button] })
    let submitted = 0
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted += 1
    })
    const enter = new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' })
    form.querySelector('input')?.dispatchEvent(enter)
    expect(submitted).toBe(1)
    expect(enter.defaultPrevented).toBe(true)
  })

  test('and not where a native submit button comes first', async () => {
    document.body.innerHTML =
      '<form><input name="a" /><button>Native</button><helix-headless-button type="submit">Save</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete
    Object.defineProperty(form, 'elements', {
      value: [form.querySelector('input'), form.querySelector('button'), button],
    })
    const enter = new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' })
    form.querySelector('input')?.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(false)
  })
})

describe('button state and name written on the host', () => {
  /* Read from Chromium's tree, a `helix-button aria-pressed="true"` was a plain
     button, and an icon-only one named with `aria-label` was unnamed: both
     stayed on the generic host. */
  test('aria-pressed reaches the inner control', async () => {
    const button = await mount(
      '<helix-headless-button aria-pressed="true">Bold</helix-headless-button>',
    )
    expect(control(button)?.getAttribute('aria-pressed')).toBe('true')
  })

  test('and so does aria-label', async () => {
    const button = await mount(
      '<helix-headless-button aria-label="Close">X</helix-headless-button>',
    )
    expect(control(button)?.getAttribute('aria-label')).toBe('Close')
  })
})

describe('a button with no name', () => {
  /* WA warns about an icon-only button with no label. A button with nothing in
     it a reader can hear is announced as "button" and nothing else. */
  test('is reported once, after it renders', async () => {
    const warnings = await warnedOn('<helix-headless-button><svg></svg></helix-headless-button>')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-button> has no accessible name')
  })

  test('words, a label or an aria-label name it', async () => {
    for (const markup of [
      '<helix-headless-button>Save</helix-headless-button>',
      '<helix-headless-button label="Close"><svg></svg></helix-headless-button>',
      '<helix-headless-icon-button aria-label="Delete row"><svg></svg></helix-headless-icon-button>',
    ]) {
      expect(await warnedOn(markup)).toEqual([])
    }
  })

  test('an icon button with no label is reported', async () => {
    expect(
      await warnedOn('<helix-headless-icon-button><svg></svg></helix-headless-icon-button>'),
    ).toHaveLength(1)
  })
})

describe('a pending button', () => {
  type Pending = Updatable & { pending: boolean; updateComplete: Promise<unknown> }

  /* React Aria's isPending: the press is refused, focus stays, and the wait
     is said. A disabled button would drop focus to the page. */
  test('is busy and refuses the press, and stays a focusable button', async () => {
    const button = (await mount(
      '<helix-headless-button pending>Save</helix-headless-button>',
    )) as Pending
    const inner = control(button) as HTMLButtonElement
    expect(inner.getAttribute('aria-busy')).toBe('true')
    expect(inner.getAttribute('aria-disabled')).toBe('true')
    expect(inner.disabled).toBe(false)
    expect(hasState(button, 'pending')).toBe(true)
    button.pending = false
    await button.updateComplete
    expect(inner.hasAttribute('aria-busy')).toBe(false)
    expect(hasState(button, 'pending')).toBe(false)
  })

  test('a press reaches no listener and submits nothing', async () => {
    document.body.innerHTML =
      '<form><helix-headless-button type="submit" pending>Send</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Pending
    await button.updateComplete
    let submitted = 0
    let heard = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    button.addEventListener('click', () => {
      heard += 1
    })
    ;(control(button) as HTMLElement).click()
    expect([submitted, heard]).toEqual([0, 0])
    button.pending = false
    await button.updateComplete
    ;(control(button) as HTMLElement).click()
    expect([submitted, heard]).toEqual([1, 1])
  })

  test('says the wait when it becomes pending under focus, and clears it after', async () => {
    const button = (await mount(
      '<helix-headless-button pending-label="Saving">Save</helix-headless-button>',
    )) as Pending
    expect(part(button, 'live')).toBeNull()
    ;(control(button) as HTMLElement).focus()
    button.pending = true
    await button.updateComplete
    await new Promise((done) => setTimeout(done, 40))
    await button.updateComplete
    expect(part(button, 'live')?.textContent).toBe('Saving')
    expect(part(button, 'live')?.getAttribute('role')).toBe('status')
    button.pending = false
    await button.updateComplete
    await new Promise((done) => setTimeout(done, 40))
    await button.updateComplete
    expect(part(button, 'live')?.textContent).toBe('')
  })

  test('says nothing when it becomes pending without focus', async () => {
    const button = (await mount('<helix-headless-button>Save</helix-headless-button>')) as Pending
    button.pending = true
    await button.updateComplete
    await new Promise((done) => setTimeout(done, 40))
    expect(part(button, 'live')).toBeNull()
  })
})

describe('what pressed the button', () => {
  /* React Aria's onPress carries pointerType. A click says it only in some
     engines, and a keyboard press and a script's click() arrive alike. */
  const heard = (host: HTMLElement): string[] => {
    const kinds: string[] = []
    host.addEventListener('helix-press', (event) => {
      kinds.push((event as CustomEvent<{ pointerType: string }>).detail.pointerType)
    })
    return kinds
  }

  test('a script click is virtual, and a click after Enter is the keyboard', async () => {
    const host = await mount('<helix-headless-button>Save</helix-headless-button>')
    const kinds = heard(host)
    const inner = control(host) as HTMLButtonElement
    inner.click()
    inner.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    inner.click()
    inner.click()
    expect(kinds).toEqual(['virtual', 'keyboard', 'virtual'])
  })

  test('a click after a pen goes down is the pen', async () => {
    const host = await mount('<helix-headless-button>Save</helix-headless-button>')
    const kinds = heard(host)
    const inner = control(host) as HTMLButtonElement
    const down = new Event('pointerdown', { bubbles: true })
    Object.defineProperty(down, 'pointerType', { value: 'pen' })
    inner.dispatchEvent(down)
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(kinds).toEqual(['pen'])
  })

  test('a pending button sends none', async () => {
    const host = await mount('<helix-headless-button pending>Save</helix-headless-button>')
    const kinds = heard(host)
    ;(control(host) as HTMLButtonElement).click()
    expect(kinds).toEqual([])
  })
})
