import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, and the import dynamic for it: an element
   registered against the `customElements` happy-dom replaces never upgrades. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The button too: what is being asserted below is the pair, and a trigger
  // that never upgrades is a trigger that cannot command anything.
  await import('../../button/index.js')
})

type Dialog = HTMLElement & {
  close(): void
  open: boolean
  persistent: boolean
  requestUpdate(): void
  show(): void
  updateComplete: Promise<boolean>
}

const dialog = async (extra = ''): Promise<Dialog> =>
  (await mount(
    `<helix-headless-dialog label="Delete project" ${extra}>
      <h2 slot="header">Delete project</h2>
      This cannot be undone.
    </helix-headless-dialog>`,
  )) as Dialog

describe('dialog', () => {
  test('it renders a real dialog element, not a div with a role', async () => {
    /* The whole design rests on this: the top layer, the backdrop, Escape and
       inert-behind are the platform's, and none of them are available to a div
       however it is labeled. */
    const host = await dialog()
    expect((part(host, 'dialog') as HTMLElement).tagName.toLowerCase()).toBe('dialog')
  })

  test('the name is on the host through internals, not as an attribute', async () => {
    const host = await dialog()
    expect(host.hasAttribute('aria-label')).toBe(false)
    expect((host as unknown as { internals?: ElementInternals }).internals?.ariaLabel).toBe(
      'Delete project',
    )
  })

  test('opening is announced before it happens, so it can be refused', async () => {
    const host = await dialog()
    host.addEventListener('helix-before-open', (event) => event.preventDefault())
    host.show()
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(false)
  })

  test('closing is announced too, and refusing it leaves the dialog open', async () => {
    const host = await dialog()
    host.show()
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(true)

    host.addEventListener('helix-before-close', (event) => event.preventDefault())
    host.close()
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(true)
  })

  test('a close that happened anyway is reflected back', async () => {
    /* `<form method="dialog">` closes the element directly and there is no
       event to prevent. The state follows rather than fights: a dialog that is
       shut while the host still says open cannot be reopened, because
       `showModal()` is never called again. */
    const host = await dialog()
    host.show()
    await host.updateComplete
    const native = part(host, 'dialog') as HTMLDialogElement
    native.dispatchEvent(new Event('close'))
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(false)
  })

  /* **Declared by (296).** `close` is public API on this element, relayed from
     the inner `<dialog>` because the native one neither bubbles nor composes and
     so reaches nobody outside this shadow root. The test above dispatches the
     same event and asks only that the state follows, which passes whether or not
     a consumer ever hears it.

     Synthesized rather than driven through `close()`: the in-app browser used to
     check this by hand fires no `close` for a bare `<dialog>` either, so the
     platform half is not observable there and the relay is the half that is
     ours. */
  test('the native close reaches a consumer, which is the whole reason it is relayed', async () => {
    const host = await dialog()
    host.show()
    await host.updateComplete

    const heard: string[] = []
    host.addEventListener('close', (event) => {
      heard.push(`${(event.composedPath()[0] as Element).localName} bubbles=${event.bubbles}`)
    })
    const native = part(host, 'dialog') as HTMLDialogElement
    /* Shut first, then announced, which is the order the platform uses and the
       order this has to imitate: a `<form method="dialog">` submit sets `open`
       false and fires `close` afterwards. Dispatching the event alone leaves the
       inner dialog open, so `updated` sees a difference, calls `close()` itself
       and a second `close` comes back. Measured. */
    native.open = false
    native.dispatchEvent(new Event('close'))
    await host.updateComplete

    /* Once. From the host and not from the `<dialog>` inside it, and not
       bubbling, which is what the platform sends and what `reactPropFor` needs
       in order to bind `onClose` at all. */
    expect(heard).toEqual([`${host.localName} bubbles=false`])
  })

  test('escape asks rather than acts, and persistent refuses it', async () => {
    const host = await dialog('persistent')
    host.show()
    await host.updateComplete
    const native = part(host, 'dialog') as HTMLDialogElement
    const cancel = new Event('cancel', { cancelable: true })
    native.dispatchEvent(cancel)
    await host.updateComplete
    expect(cancel.defaultPrevented).toBe(true)
    expect(hasState(host, 'open')).toBe(true)
  })
})

describe('a form in the dialog', () => {
  /* The platform closes the nearest `<dialog>` ancestor of a `method="dialog"`
     form, and a slotted form's ancestors are the light DOM, where there is
     none. So the dialog stayed open and said nothing. */
  test('closes it with `method="dialog"`, and the button’s value is the return value', async () => {
    const host = (await mount(
      `<helix-headless-dialog label="Confirm">
        <form method="dialog"><button value="ok">OK</button></form>
      </helix-headless-dialog>`,
    )) as Dialog & { returnValue: string }
    host.show()
    await host.updateComplete
    const form = host.querySelector('form') as HTMLFormElement
    const submit = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
      submitter: form.querySelector('button'),
    })
    /* Read while the close is still a request: happy-dom's `close()` resets
       `returnValue`, where a browser's keeps it. */
    let returned = ''
    host.addEventListener('helix-before-close', () => {
      returned = host.returnValue
    })
    form.dispatchEvent(submit)
    await host.updateComplete
    expect([hasState(host, 'open'), returned, submit.defaultPrevented]).toEqual([false, 'ok', true])
  })

  test('and leaves any other form alone', async () => {
    const host = (await mount(
      `<helix-headless-dialog label="Search">
        <form><button>Go</button></form>
      </helix-headless-dialog>`,
    )) as Dialog
    host.show()
    await host.updateComplete
    const form = host.querySelector('form') as HTMLFormElement
    form.addEventListener('submit', (event) => event.preventDefault())
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(true)
  })
})

describe('the dialog’s name', () => {
  /* happy-dom has no ARIA element reflection, so the accessor is stood in on
     the `<dialog>`, which is what an engine with reflection provides. */
  const reflecting = async (markup: string): Promise<{ host: Dialog; names: () => string[] }> => {
    const host = (await mount(markup)) as Dialog
    const native = part(host, 'dialog') as HTMLDialogElement & Record<string, unknown>
    if (!('ariaLabelledByElements' in native)) {
      Object.defineProperty(native, 'ariaLabelledByElements', { value: null, writable: true })
    }
    host.requestUpdate()
    await host.updateComplete
    const names = (): string[] =>
      ((native.ariaLabelledByElements as Element[] | null) ?? []).map(
        (one) => one.textContent ?? '',
      )
    return { host, names }
  }

  test('is the heading in the header when no label is given', async () => {
    const { names } = await reflecting(
      `<helix-headless-dialog>
        <div slot="header"><h2>Delete project</h2><button>Close</button></div>
      </helix-headless-dialog>`,
    )
    expect(names()).toEqual(['Delete project'])
  })

  test('and steps aside for a label', async () => {
    const { names } = await reflecting(
      `<helix-headless-dialog label="Given">
        <h2 slot="header">Delete project</h2>
      </helix-headless-dialog>`,
    )
    expect(names()).toEqual([])
  })
})

describe('the page behind an open dialog', () => {
  test('does not scroll, and gets its own overflow back once the dialog closes', async () => {
    const root = document.documentElement
    root.style.overflow = 'clip'
    try {
      const host = await dialog()
      host.show()
      await host.updateComplete
      const held = root.style.overflow
      host.close()
      await host.updateComplete
      expect([held, root.style.overflow]).toEqual(['hidden', 'clip'])
    } finally {
      root.style.overflow = ''
    }
  })
})

describe('dialog invokers', () => {
  const wired = async (): Promise<{ dialog: Dialog; trigger: HTMLElement }> => {
    const trigger = (await mount(
      `<helix-headless-button command="--show" commandfor="confirm">Delete</helix-headless-button>
       <helix-headless-dialog id="confirm" label="Delete project">Body</helix-headless-dialog>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    const dialog = trigger.nextElementSibling as Dialog
    await trigger.updateComplete
    await dialog.updateComplete
    return { dialog, trigger }
  }

  /* The inner control, because that is what a reader's pointer lands on: the
     host has no activation behavior of its own, and a click dispatched at it
     runs none. Measured: a spec pressing the host passes on a button nobody can
     press. */
  const press = (trigger: HTMLElement): void => {
    const inner = trigger.shadowRoot?.querySelector('button')
    if (!inner) {
      throw new Error('the trigger rendered no button, so there is nothing to press')
    }
    inner.click()
  }

  test('a button opens it, whether or not the browser has invokers', async () => {
    /* This is the one that matters, and it is the same assertion in both
       environments by design. Chromium runs it through the platform's own
       invoker; happy-dom has no `commandForElement` at all, so it runs it
       through the fallback. Before the fallback existed, every `command` in the
       library was dead in any browser older than Chrome 135, Firefox 137 or
       Safari 18.4, and dead in the quietest possible way: right markup, right
       component, and a button that did nothing when pressed. */
    const { dialog, trigger } = await wired()
    press(trigger)
    await dialog.updateComplete
    expect(hasState(dialog, 'open')).toBe(true)
  })

  test('exactly one command arrives, so the two paths never both fire', async () => {
    /* The failure this guards is only visible where things work. If the button
       sent its own event *and* the platform sent one, a browser with invokers
       would open the dialog and immediately toggle it shut, and every browser
       without them would look fine. */
    const { dialog, trigger } = await wired()
    const seen: string[] = []
    dialog.addEventListener('command', (event) => {
      seen.push((event as Event & { command: string }).command)
    })
    press(trigger)
    await dialog.updateComplete
    expect(seen).toEqual(['--show'])
  })

  test('a command naming nothing reaches nothing', async () => {
    /* Both halves, and they say different things. `not.toThrow` is that the
       press survived; the state after it is that it did nothing. */
    const { dialog, trigger } = await wired()
    trigger.setAttribute('commandfor', 'absent')
    await (trigger as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(() => press(trigger)).not.toThrow()
    await dialog.updateComplete
    expect(hasState(dialog, 'open')).toBe(false)
  })
})

if (hasLayout()) {
  describe('dialog geometry', () => {
    test('a closed dialog paints nothing', async () => {
      /* Every other spec in this file asserts state, and state was correct
         while the dialog sat open on the screen: the host said closed, the
         native element had no `open`, and it rendered anyway, because the
         panel's own `display: flex` outranks the UA rule that hides it. Origin
         beats specificity, so nothing about the declaration looks wrong and
         nothing reports it.

         Only a browser can answer this. happy-dom has no layout and no UA
         stylesheet, so a closed dialog measures zero there whether or not the
         bug is present, and the check would pass on the broken build. */
      const host = await dialog()
      expect((part(host, 'dialog') as HTMLElement).getBoundingClientRect().height).toBe(0)
    })

    test('an open one does, and is in the top layer', async () => {
      /* The pair matters. Hiding a closed dialog is easy to do so thoroughly
         that an open one is hidden too, and `:modal` is what separates a panel
         that is merely visible from one the platform has actually raised: the
         scrim, Escape and inert-behind all follow from it. */
      const host = await dialog()
      host.show()
      await host.updateComplete
      const native = part(host, 'dialog') as HTMLDialogElement
      expect(native.getBoundingClientRect().height).toBeGreaterThan(0)
      expect(native.matches(':modal')).toBe(true)
      host.close()
    })
  })
}

describe('dialog framing', () => {
  const framed = async (extra = ''): Promise<Dialog> =>
    (await mount(
      `<helix-headless-dialog label="Discard changes" ${extra}>
        <span slot="icon">!</span>
        <h2 slot="header">Discard changes?</h2>
        Nine edits have not been saved.
        <span slot="footer">actions</span>
      </helix-headless-dialog>`,
    )) as Dialog

  test('the mark sits above the title, in its own slot', async () => {
    // Its own, rather than something a consumer nests in the header: slotted
    // into a heading it is an icon at a heading's scale, and every product
    // would pick a different one. The dialog owns how big a mark is.
    const host = await framed()
    const slots = [...(host.shadowRoot?.querySelectorAll('slot') ?? [])].map((one) =>
      one.getAttribute('name'),
    )
    expect(slots).toEqual(['icon', 'header', null, 'footer'])
  })

  test('and a dialog with no mark has no empty band where one is not', async () => {
    // Bare, like the header and the footer. An unassigned slot generates no box.
    const host = await dialog()
    const icon = host.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(icon.assignedNodes().length).toBe(0)
  })

  test('centering is one property for the panel, not one per region', async () => {
    // The regions are never mixed: a dialog that asks a short question centers
    // all four together, and one holding a form runs all four from the start.
    const host = await framed('text-align="center"')
    expect(host.getAttribute('text-align')).toBe('center')
  })

  test('unset stays unset, so no default is reflected onto the host', async () => {
    const host = await framed()
    expect(host.hasAttribute('text-align')).toBe(false)
  })
})

/**
 * A dialog that opens on its own waits for what is inside it to have rendered.
 *
 * **The fault this exists for is a modal that focuses itself.** `showModal()`
 * moves focus to the first focusable descendant, and a custom element that has
 * not rendered its shadow yet has none, so the browser falls back to the dialog.
 * Markup never showed it, the parser having upgraded everything before this
 * element's first update. React does: it connects the dialog before a nested
 * component has rendered, and a `default-open` dialog opened with focus on the
 * dialog rather than on the field inside it. Measured against the markup twin of
 * `chat/command-palette`, `document.activeElement` was `dialog[dialog]` where the markup
 * one had `textarea[field]`.
 *
 * **What is asserted here is the deferral, not the focus**, and deliberately.
 * Focus after `showModal()` is the browser's own behavior and happy-dom does not
 * implement it, so a focus assertion would pass vacuously in `bun run test` and
 * only mean something in `specs:browser`. The deferral is the change, it is
 * observable in both, and the focus outcome is held by rendering the two twins
 * and comparing them.
 */
describe('a dialog opening on its own', () => {
  test('waits for a slotted element to render before it opens', async () => {
    const host = await mount(
      `<helix-headless-dialog default-open label="Filters">
         <helix-headless-button>Later</helix-headless-button>
       </helix-headless-dialog>`,
    )
    const inner = part(host, 'dialog') as HTMLDialogElement

    /* The host has rendered, which is what `mount` waits for. The dialog has
       not opened yet, because the button inside it has not finished its own
       first update. */
    expect(inner.open).toBe(false)

    await Promise.all(
      [...host.children].map(
        (one) => (one as Partial<{ updateComplete: Promise<unknown> }>).updateComplete,
      ),
    )
    await Promise.resolve()

    expect(inner.open).toBe(true)
    host.remove()
  })

  /* Nothing to wait for is the common case and must not cost a turn of the
     event loop that a consumer could see: a dialog with plain children opens on
     the microtask its own update ends in. */
  test('and opens without waiting when nothing slotted has an update to finish', async () => {
    const host = await mount(
      `<helix-headless-dialog default-open label="Filters"><p>Plain</p></helix-headless-dialog>`,
    )
    await Promise.resolve()
    expect((part(host, 'dialog') as HTMLDialogElement).open).toBe(true)
    host.remove()
  })
})

describe('an alert dialog', () => {
  test('is an alertdialog when asked, and an ordinary dialog otherwise', async () => {
    const plain = await dialog()
    expect(part(plain, 'dialog')?.hasAttribute('role')).toBe(false)
    const alert = await dialog('alert')
    expect(part(alert, 'dialog')?.getAttribute('role')).toBe('alertdialog')
  })
})

describe('the dialog’s description', () => {
  /* The same stand-in the name uses: happy-dom has no element reflection. */
  const reflecting = async (markup: string): Promise<{ host: Dialog; said: () => string[] }> => {
    const host = (await mount(markup)) as Dialog
    const native = part(host, 'dialog') as HTMLDialogElement & Record<string, unknown>
    if (!('ariaDescribedByElements' in native)) {
      Object.defineProperty(native, 'ariaDescribedByElements', { value: null, writable: true })
    }
    host.requestUpdate()
    await host.updateComplete
    const said = (): string[] =>
      ((native.ariaDescribedByElements as Element[] | null) ?? []).map(
        (one) => one.textContent?.trim() ?? '',
      )
    return { host, said }
  }

  test('is the words at the start of the body, and stops at the first control', async () => {
    const { said } = await reflecting(
      `<helix-headless-dialog alert>
        <h2 slot="header">Delete project</h2>
        <p>The project and its history go.</p>
        <p>This cannot be undone.</p>
        <form><label>Name <input /></label></form>
        <p>After the form.</p>
      </helix-headless-dialog>`,
    )
    expect(said()).toEqual(['The project and its history go.', 'This cannot be undone.'])
  })

  test('is nothing where the body starts with a control', async () => {
    const { said } = await reflecting(
      `<helix-headless-dialog>
        <helix-headless-input label="Name"></helix-headless-input>
        <p>Below the field.</p>
      </helix-headless-dialog>`,
    )
    expect(said()).toEqual([])
  })

  test('steps aside for an aria-describedby on the host', async () => {
    const { said } = await reflecting(
      `<helix-headless-dialog aria-describedby="nowhere">
        <p>The project and its history go.</p>
      </helix-headless-dialog>`,
    )
    expect(said()).not.toContain('The project and its history go.')
  })
})

describe('the dialog’s regions and close control', () => {
  test('the header, body and footer are parts on their slots, which draw no box of their own', async () => {
    const host = await dialog()
    for (const name of ['header', 'body', 'footer']) {
      expect(part(host, name)?.localName).toBe('slot')
    }
  })

  test('no close control unless it is dismissible', async () => {
    expect(part(await dialog(), 'dismiss')).toBeNull()
  })

  test('a dismissible dialog draws one, named in the consumer’s words, that asks to close', async () => {
    const host = await dialog('dismissible dismiss-label="Schließen" default-open')
    const control = part(host, 'dismiss') as HTMLButtonElement
    expect(control.localName).toBe('button')
    expect(control.getAttribute('aria-label')).toBe('Schließen')
    let asked = 0
    host.addEventListener('helix-before-close', () => {
      asked += 1
    })
    control.click()
    await host.updateComplete
    expect(asked).toBe(1)
    expect(host.open).toBe(false)
  })

  test('the close control is last, so opening still focuses the content first', async () => {
    const host = await dialog('dismissible')
    const native = part(host, 'dialog') as HTMLDialogElement
    expect(native.lastElementChild?.getAttribute('part')).toBe('dismiss')
  })
})

describe('entering and exiting', () => {
  /* Polls until neither phase holds, rather than sleeping a fixed time. */
  const frames = async (host?: Dialog): Promise<void> => {
    const until = Date.now() + 1500
    do {
      await new Promise((resolve) => setTimeout(resolve, 10))
    } while (
      host &&
      (hasState(host, 'entering') || hasState(host, 'exiting')) &&
      Date.now() < until
    )
  }

  test('a dialog opening is entering until it settles, and one closing is exiting', async () => {
    const host = await dialog()
    host.show()
    await host.updateComplete
    expect(hasState(host, 'entering')).toBe(true)
    expect(hasState(host, 'exiting')).toBe(false)
    await frames(host)
    expect(hasState(host, 'entering')).toBe(false)
    host.close()
    await host.updateComplete
    expect(hasState(host, 'exiting')).toBe(true)
    await frames(host)
    expect(hasState(host, 'exiting')).toBe(false)
  })

  test('a dialog served open is neither, since nothing moved', async () => {
    const host = await dialog('default-open')
    expect(hasState(host, 'entering')).toBe(false)
    expect(hasState(host, 'exiting')).toBe(false)
  })
})

describe('Tab at either end of the dialog', () => {
  const press = (from: Element, shiftKey = false): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Tab',
      shiftKey,
    })
    from.dispatchEvent(event)
    return event
  }

  test('wraps to the other end, the close control included, rather than leaving the page', async () => {
    const host = (await mount(
      `<helix-headless-dialog label="Rename" dismissible>
        <input id="name" aria-label="Name">
        <button id="save" slot="footer">Save</button>
      </helix-headless-dialog>`,
    )) as Dialog
    host.show()
    await host.updateComplete
    const dismiss = part(host, 'dismiss') as HTMLElement
    dismiss.focus()
    expect(press(dismiss).defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('name')
    const name = host.querySelector('#name') as HTMLElement
    expect(press(name, true).defaultPrevented).toBe(true)
    expect(host.shadowRoot?.activeElement).toBe(dismiss)
  })

  test('and moves on as usual in between', async () => {
    const host = (await mount(
      `<helix-headless-dialog label="Rename">
        <input id="name" aria-label="Name">
        <button id="save" slot="footer">Save</button>
      </helix-headless-dialog>`,
    )) as Dialog
    host.show()
    await host.updateComplete
    const name = host.querySelector('#name') as HTMLElement
    name.focus()
    expect(press(name).defaultPrevented).toBe(false)
  })
})
