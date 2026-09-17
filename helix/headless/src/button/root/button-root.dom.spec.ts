import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

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
