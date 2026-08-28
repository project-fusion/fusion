import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle } from '@fusion.dev/helix-testing/dom'

/**
 * One change, one pair of native announcements, however many elements are inside.
 *
 * **294 moved every consumer onto `onChange` and left the composed controls
 * announcing twice.** A `<helix-select>` renders a `<helix-listbox>`, and after
 * that change both of them announced: the listbox dispatched `input` and
 * `change` from its own host, `input` is composed by specification, and the
 * pair crossed the select's shadow boundary to arrive beside the select's own.
 * Measured on the styled tier before the fix, one choice made on the inner
 * listbox produced `input` twice and `change` three times. The prefixed request
 * never had this, because every one of those components already stopped the
 * child's `helix-before-change` and spoke for itself; the natives arrived
 * without the equivalent.
 *
 * Across families rather than in each family's own file, because what is being
 * asserted is a property of the composition and the bug was invisible from
 * inside any one of them: each component was individually correct.
 *
 * The inner control is found rather than named, so a family that gains one is
 * covered without this file being edited, and a family that stops rendering one
 * says so instead of quietly passing.
 */
beforeAll(async () => {
  registerDom()
  /* The families this exercises, not the barrel.
   *
   * `hydration.dom.spec.ts` collects its tag list by patching
   * `customElements.define` and importing the barrel, so whichever file
   * evaluates the barrel first is the one that sees the registrations: a second
   * import is a module-cache hit and defines nothing. Importing it here left
   * that spec with an empty list and a `mounted` count of zero, which it
   * reports as a floor failure rather than as the collision it is.
   *
   * Naming the families is the right shape for this file anyway. It is a
   * cross-family spec, not an every-family one, and what it needs is the six
   * that compose plus the group and the controls they contain. */
  await Promise.all([
    import('./chat/index.js'),
    import('./checkbox/index.js'),
    import('./color-picker/index.js'),
    import('./checkbox-group/index.js'),
    import('./color-input/index.js'),
    import('./combobox/index.js'),
    import('./command/index.js'),
    import('./date-input/index.js'),
    import('./file-input/index.js'),
    import('./input/index.js'),
    import('./listbox/index.js'),
    import('./number-input/index.js'),
    import('./pin-input/index.js'),
    import('./option/index.js'),
    import('./select/index.js'),
    import('./slider/index.js'),
    import('./switch/index.js'),
    import('./textarea/index.js'),
    import('./time-input/index.js'),
    import('./video/index.js'),
  ])
})

const OPTIONS = `<helix-headless-option value="a">A</helix-headless-option><helix-headless-option value="b">B</helix-headless-option>`

const COMPOSED: Array<[string, string]> = [
  ['helix-headless-select', `<helix-headless-select label="L">${OPTIONS}</helix-headless-select>`],
  [
    'helix-headless-combobox',
    `<helix-headless-combobox label="L">${OPTIONS}</helix-headless-combobox>`,
  ],
  [
    'helix-headless-date-input',
    `<helix-headless-date-input label="L"></helix-headless-date-input>`,
  ],
  [
    'helix-headless-time-input',
    `<helix-headless-time-input label="L"></helix-headless-time-input>`,
  ],
  [
    'helix-headless-color-input',
    `<helix-headless-color-input label="L"></helix-headless-color-input>`,
  ],
]

/** The control this one renders, whichever it is, found by the API it answers to. */
const innerControl = (
  host: HTMLElement,
): (HTMLElement & { requestValue(next: string): boolean }) | undefined => {
  const root = (host as unknown as { renderRoot?: ParentNode }).renderRoot
  return [...(root?.querySelectorAll('*') ?? [])].find(
    (element) =>
      element !== host &&
      typeof (element as { requestValue?: unknown }).requestValue === 'function',
  ) as (HTMLElement & { requestValue(next: string): boolean }) | undefined
}

describe('a control that renders another control', () => {
  test.each(COMPOSED)('%s announces once, not once per element', async (tag, markup) => {
    const host = (await mount(markup)) as HTMLElement
    await settle(host)
    const inner = innerControl(host)
    expect(inner, `${tag} renders no inner value control`).toBeDefined()

    const heard: string[] = []
    for (const type of ['change', 'input']) {
      host.addEventListener(type, (event) => {
        heard.push(`${type}@${(event.composedPath()[0] as Element).localName}`)
      })
    }
    inner?.requestValue('b')
    await settle(host)

    /* Named by element rather than counted, so a failure says which one spoke
       out of turn instead of only that the total was wrong. */
    expect(heard.toSorted()).toEqual([`change@${tag}`, `input@${tag}`])
  })
})

describe('a palette, which is the case that announces nothing', () => {
  /* `Command` renders a listbox and is deliberately not a value control: its own
     comment says the listbox's word is "the right word for a control that holds
     a value and the wrong one for a palette, nothing here changed, a command
     ran". So the correct native count here is zero, and what it had was one, the
     listbox's `input` crossing the boundary and describing a value the palette
     does not have. It is the same leak as the five above and the opposite
     expectation, which is why it is asserted separately rather than folded into
     the table. */
  test('command relays no native, because nothing changed', async () => {
    const host = (await mount(
      `<helix-headless-command label="L">${OPTIONS}</helix-headless-command>`,
    )) as HTMLElement
    await settle(host)
    const inner = innerControl(host)
    expect(inner, 'command renders no inner listbox').toBeDefined()

    const heard: string[] = []
    for (const type of ['change', 'input']) {
      host.addEventListener(type, (event) => {
        heard.push(`${type}@${(event.composedPath()[0] as Element).localName}`)
      })
    }
    inner?.requestValue('b')
    await settle(host)

    expect(heard).toEqual([])
  })
})

describe('a group whose members are controls in their own right', () => {
  /* Checkbox Group is the one where this is not obvious. Each box is
     form-associated and submits itself, so each announces, and the group has a
     value of its own and announces too: before this, one click produced the
     group's `change` and the box's `input` and `change`, all three at a
     consumer listening on the group, two of them describing one box rather than
     the set. Radio Group and Toggle Group never had it, their members being
     option-shaped and announcing nothing. */
  test('the group is the single voice for the set', async () => {
    const host = (await mount(
      `<helix-headless-checkbox-group label="L"><helix-headless-checkbox value="a">A</helix-headless-checkbox><helix-headless-checkbox value="b">B</helix-headless-checkbox></helix-headless-checkbox-group>`,
    )) as HTMLElement
    await settle(host)

    const heard: string[] = []
    for (const type of ['change', 'input']) {
      host.addEventListener(type, (event) => {
        heard.push(`${type}@${(event.composedPath()[0] as Element).localName}`)
      })
    }
    const box = host.querySelector('helix-headless-checkbox') as HTMLElement
    const inner = (box as unknown as { renderRoot: ParentNode }).renderRoot.querySelector(
      'input',
    ) as HTMLInputElement
    inner.click()
    await settle(host)

    expect(heard.toSorted()).toEqual([
      'change@helix-headless-checkbox-group',
      'input@helix-headless-checkbox-group',
    ])
  })

  /* The other half, and the reason the stop is `stopImmediatePropagation` at
     the group rather than something the box does: a box remains a control and a
     consumer listening on one still hears it. */
  test('a listener on the box still hears the box', async () => {
    const host = (await mount(
      `<helix-headless-checkbox-group label="L"><helix-headless-checkbox value="a">A</helix-headless-checkbox></helix-headless-checkbox-group>`,
    )) as HTMLElement
    await settle(host)

    const box = host.querySelector('helix-headless-checkbox') as HTMLElement
    const heard: string[] = []
    for (const type of ['change', 'input']) {
      box.addEventListener(type, () => heard.push(type))
    }
    const inner = (box as unknown as { renderRoot: ParentNode }).renderRoot.querySelector(
      'input',
    ) as HTMLInputElement
    inner.click()
    await settle(host)

    expect(heard.toSorted()).toEqual(['change', 'input'])
  })
})

describe('a control that renders a native control', () => {
  /* **`input` is composed by specification, so the inner control's own event
     leaves the shadow root.** Every form control here renders a real `<input>`
     or `<textarea>` and announces `input` from the host beside it, so one
     keystroke reached a consumer twice and one of the two carried the value from
     before the change. Measured in Chrome 148 on `<helix-checkbox>`: `input`
     from the inner control with `checked` still false, then
     `helix-before-toggle`, then `input` from the host with it true.
     `handleChange` had stopped the inner one since it was written and
     `handleInput` never did, so the pair was half applied. */
  const NATIVE: Array<[string, string, 'bare' | 'check' | 'text']> = [
    ['helix-headless-input', `<helix-headless-input label="L"></helix-headless-input>`, 'text'],
    [
      'helix-headless-textarea',
      `<helix-headless-textarea label="L"></helix-headless-textarea>`,
      'text',
    ],
    [
      'helix-headless-number-input',
      `<helix-headless-number-input label="L"></helix-headless-number-input>`,
      'text',
    ],
    ['helix-headless-slider', `<helix-headless-slider label="L"></helix-headless-slider>`, 'text'],
    [
      'helix-headless-checkbox',
      `<helix-headless-checkbox label="L"></helix-headless-checkbox>`,
      'check',
    ],
    ['helix-headless-switch', `<helix-headless-switch label="L"></helix-headless-switch>`, 'check'],
    /* The two the first sweep missed, because it started from the seven that
       announce through `MixinControllerValue` rather than from every family that
       renders a native control. File Input declared `input` and sent none, so
       the only one a consumer received was the inner `<input type="file">`'s;
       Color Picker stopped its hue and alpha rails since they were written and
       left the two area axes inline, moving the color and stopping nothing. */
    [
      'helix-headless-file-input',
      `<helix-headless-file-input label="L"></helix-headless-file-input>`,
      'bare',
    ],
    [
      'helix-headless-color-picker',
      `<helix-headless-color-picker></helix-headless-color-picker>`,
      'text',
    ],
  ]

  test.each(NATIVE)('%s announces once, not once per element', async (tag, markup, kind) => {
    const host = (await mount(markup)) as HTMLElement
    await settle(host)
    const inner = (host as unknown as { renderRoot: ParentNode }).renderRoot.querySelector(
      'input, textarea',
    ) as HTMLInputElement | HTMLTextAreaElement
    expect(inner, `${tag} renders no native control`).toBeDefined()

    const heard: string[] = []
    host.addEventListener('input', (event) => {
      heard.push((event.composedPath()[0] as Element).localName)
    })
    if (kind === 'check') {
      ;(inner as HTMLInputElement).click()
    } else if (kind === 'bare') {
      /* A file input refuses a programmatic `value`, which is the platform
         protecting the filesystem rather than anything about this element, and
         it announces off `change` rather than off `input`: the inner control
         sends both and this element answers the second. Both are dispatched so
         the assertion sees whatever escapes, which before the fix was the inner
         `input` and nothing of this element's. */
      inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      inner.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      inner.value = '7'
      inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    await settle(host)

    /* Named by element rather than counted, so a failure says which one spoke
       out of turn rather than only that the total was wrong. */
    expect(heard).toEqual([tag])
  })
})

describe('the native pair a control sends', () => {
  /* Measured in Chrome 148 rather than recalled: `change` is `bubbles: true,
     composed: false` and `input` is `bubbles: true, composed: true`. The
     difference matters where a consumer puts a Helix control inside a shadow
     root of their own, which is where a composed `change` would escape and a
     native `<input>`'s would not. */
  test('change does not cross a shadow boundary, the way the platform sends it', async () => {
    const host = (await mount(
      `<helix-headless-input label="L"></helix-headless-input>`,
    )) as HTMLElement
    await settle(host)

    const flags: Record<string, boolean> = {}
    host.addEventListener('change', (event) => {
      flags.bubbles = event.bubbles
      flags.composed = event.composed
    })
    /* Through the control's own commit path rather than by dispatching the
       event under test, which would assert the flags the test just wrote. The
       inner field commits and the host relays. */
    const field = (host as unknown as { renderRoot: ParentNode }).renderRoot.querySelector(
      'input',
    ) as HTMLInputElement
    field.value = 'Ada'
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(host)

    expect(flags).toEqual({ bubbles: true, composed: false })
  })

  test('input still crosses one, because the platform composes that half', async () => {
    const host = (await mount(
      `<helix-headless-listbox label="L">${OPTIONS}</helix-headless-listbox>`,
    )) as HTMLElement & { requestValue(next: string): boolean }
    await settle(host)

    const flags: Record<string, boolean> = {}
    host.addEventListener('input', (event) => {
      flags.bubbles = event.bubbles
      flags.composed = event.composed
    })
    host.requestValue('b')
    await settle(host)

    expect(flags).toEqual({ bubbles: true, composed: true })
  })
})

describe('no family lets an inner native control speak in its name', () => {
  /* **The population is the shape, which is the whole lesson of 308.** That row
     was found through one mechanism, a rail forwarding without stopping, and
     fixed in the seven families that mechanism reached. Sweeping instead by what
     a family *renders* found two more, File Input and Color Picker. Sweeping by
     that shape and meaning it found a third, Video, whose scrubber and volume
     rail are `<input type="range">` in a component that declares no `input` at
     all: both passes before this one had read "renders a native control" as
     "is a form control", and a media component with two rails in its chrome is
     neither a form control nor exempt from the mechanism.

     So every family that renders an `<input>`, `<textarea>` or `<select>` is
     listed here, and the assertion is the one thing true of all of them however
     they differ: whatever a consumer hears on the host is the host's. What each
     family announces of its own is the table above and the two cases either side
     of it. This is only about what escapes. */
  const RENDERS_NATIVE: Array<[string, string]> = [
    [
      'helix-headless-chat',
      `<helix-headless-chat label="L"><helix-headless-chat-composer slot="composer"></helix-headless-chat-composer></helix-headless-chat>`,
    ],
    ['helix-headless-checkbox', `<helix-headless-checkbox label="L"></helix-headless-checkbox>`],
    [
      'helix-headless-checkbox-group',
      `<helix-headless-checkbox-group label="L"><helix-headless-checkbox label="a" value="a"></helix-headless-checkbox></helix-headless-checkbox-group>`,
    ],
    [
      'helix-headless-color-input',
      `<helix-headless-color-input label="L"></helix-headless-color-input>`,
    ],
    ['helix-headless-color-picker', `<helix-headless-color-picker></helix-headless-color-picker>`],
    ['helix-headless-combobox', `<helix-headless-combobox label="L"></helix-headless-combobox>`],
    [
      'helix-headless-date-input',
      `<helix-headless-date-input label="L"></helix-headless-date-input>`,
    ],
    [
      'helix-headless-file-input',
      `<helix-headless-file-input label="L"></helix-headless-file-input>`,
    ],
    ['helix-headless-input', `<helix-headless-input label="L"></helix-headless-input>`],
    [
      'helix-headless-listbox',
      `<helix-headless-listbox filterable label="L"></helix-headless-listbox>`,
    ],
    [
      'helix-headless-number-input',
      `<helix-headless-number-input label="L"></helix-headless-number-input>`,
    ],
    ['helix-headless-pin-input', `<helix-headless-pin-input label="L"></helix-headless-pin-input>`],
    ['helix-headless-slider', `<helix-headless-slider label="L"></helix-headless-slider>`],
    ['helix-headless-switch', `<helix-headless-switch label="L"></helix-headless-switch>`],
    ['helix-headless-textarea', `<helix-headless-textarea label="L"></helix-headless-textarea>`],
    [
      'helix-headless-time-input',
      `<helix-headless-time-input label="L"></helix-headless-time-input>`,
    ],
    ['helix-headless-video', `<helix-headless-video label="L"></helix-headless-video>`],
  ]

  test.each(RENDERS_NATIVE)('%s speaks for its own controls', async (_tag, markup) => {
    const host = (await mount(markup)) as HTMLElement
    await settle(host)
    for (const child of host.querySelectorAll('*')) {
      await settle(child as HTMLElement)
    }
    /* Down through every shadow root, not just this element's own. Six of these
       render their native control inside a child's: Chat's composer, the two
       groups' members, the two pickers' field, Pagination's size select. That is
       exactly where a composed `input` starts its journey, so a query that
       stopped at the host's own root would report those six clean by never
       looking at them. */
    const inners: HTMLInputElement[] = []
    const dig = (root: ParentNode): void => {
      for (const node of root.querySelectorAll('*')) {
        if (['input', 'select', 'textarea'].includes(node.localName)) {
          inners.push(node as HTMLInputElement)
        }
        if (node.shadowRoot) {
          dig(node.shadowRoot)
        }
      }
    }
    /* Both trees. A group's members are slotted rather than rendered, so they are
       light-DOM children of the host and are not in its render root at all. */
    dig(host)
    dig((host as unknown as { renderRoot: ParentNode }).renderRoot)
    /* Not an empty list: a family listed here that stops rendering one should
       say so rather than pass by having nothing to leak. */
    expect(inners.length).toBeGreaterThan(0)

    const escaped: string[] = []
    host.addEventListener('input', (event) => {
      const from = event.composedPath()[0] as Element
      if (from !== host) {
        escaped.push(`${from.localName}[${(from as HTMLInputElement).type}]`)
      }
    })
    for (const inner of inners) {
      inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    await settle(host)

    expect(escaped).toEqual([])
  })
})
