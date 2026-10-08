import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Whether a control has a name, and the one warning when it has none.
 *
 * Imported after `registerDom()`, so the module reads happy-dom's `Node` and
 * `HTMLSlotElement` rather than bun's.
 */
let auditName: typeof import('./audit-name.js').auditName
let auditField: typeof import('./audit-name.js').auditField
let auditIconControl: typeof import('./audit-name.js').auditIconControl
let hasName: typeof import('./audit-name.js').hasName

beforeAll(async () => {
  registerDom()
  ;({ auditField, auditIconControl, auditName, hasName } = await import('./audit-name.js'))
})

describe('the name estimate', () => {
  const inShadow = (content: string): HTMLElement => {
    document.body.innerHTML = '<span>Words</span>'
    const host = document.body.firstElementChild as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = content
    return root.firstElementChild as HTMLElement
  }

  test('reads an aria-label, a title and a label in the same tree', () => {
    expect(hasName(inShadow('<input aria-label="Email">'))).toBe(true)
    expect(hasName(inShadow('<input title="Email">'))).toBe(true)
    expect(hasName(inShadow('<input id="i"><label for="i">Email</label>'))).toBe(true)
    expect(hasName(inShadow('<input aria-labelledby="l"><span id="l">Email</span>'))).toBe(true)
    expect(hasName(inShadow('<input aria-labelledby="l"><span id="l"></span>'))).toBe(false)
  })

  /* A Color Input with no label was named "#000000" by its placeholder, and
     the audit took that for a name. */
  test('takes no name from a placeholder, which is gone once a person types', () => {
    expect(hasName(inShadow('<input placeholder="Email">'))).toBe(false)
  })

  test('takes no words from the part that shows the value', () => {
    const trigger = inShadow(
      '<button aria-labelledby="value"><span part="value" id="value">Choose</span></button>',
    )
    const value = trigger.querySelector('[part="value"]')
    expect(hasName(trigger)).toBe(true)
    expect(hasName(trigger, value)).toBe(false)
    trigger.insertAdjacentHTML('afterbegin', '<span>Language</span>')
    expect(hasName(trigger, value)).toBe(true)
  })

  /* Icon reports an unnamed decorative icon that is all a link or a summary
     holds, and asks the same question of them. */
  test('takes a link’s and a summary’s content, as a button’s', () => {
    expect(hasName(inShadow('<a href="/home"><slot></slot></a>'))).toBe(true)
    expect(hasName(inShadow('<summary><slot></slot></summary>'))).toBe(true)
    expect(hasName(inShadow('<a><slot></slot></a>'))).toBe(false)
    expect(hasName(inShadow('<a href="/home"><svg></svg></a>'))).toBe(false)
  })

  test('takes content only where the role is named by it', () => {
    expect(hasName(inShadow('<button><slot></slot></button>'))).toBe(true)
    expect(hasName(inShadow('<div role="switch"><slot></slot></div>'))).toBe(true)
    expect(hasName(inShadow('<div role="group"><slot></slot></div>'))).toBe(false)
  })
})

describe('the warning', () => {
  /** What `console.warn` was handed while the check ran, with nothing printed. */
  const warned = async (during: () => void): Promise<string[]> => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      during()
      await new Promise((done) => setTimeout(done, 5))
    } finally {
      console.warn = original
    }
    return warnings
  }

  /** A host holding a native button, in a shadow root, with `content` in it. */
  const button = (host: string, content: string): { control: HTMLElement; host: HTMLElement } => {
    document.body.innerHTML = `<label for="field">Outside</label>${host}`
    const element = document.body.lastElementChild as HTMLElement
    const root = element.attachShadow({ mode: 'open' })
    root.innerHTML = `<button part="button">${content}</button>`
    return { control: root.querySelector('button') as HTMLElement, host: element }
  }

  test('is reported once, by its tag, a task after it asks', async () => {
    const { control, host } = button('<span></span>', '<svg></svg>')
    const warnings = await warned(() => {
      auditName(host, () => control, 'Give it words.')
      auditName(host, () => control, 'Give it words.')
    })
    expect(warnings).toEqual([
      '<span> has no accessible name, so a screen reader announces it by its role alone. Give it words.',
    ])
    expect(await warned(() => auditName(host, () => control, 'Give it words.'))).toEqual([])
  })

  /* Button passes a key, so its sentence ships in a development build only. */
  test('says the sentence a key names', async () => {
    const { control, host } = button('<b></b>', '<svg></svg>')
    expect(await warned(() => auditName(host, () => control, 'button'))).toEqual([
      '<b> has no accessible name, so a screen reader announces it by its role alone. Give it words, a `label`, or an `aria-label`.',
    ])
  })

  test('words in it, read through a slot, name a button', async () => {
    const { control, host } = button('<span>Save</span>', '<slot></slot>')
    expect(await warned(() => auditName(host, () => control, ''))).toEqual([])
  })

  test('an icon named by its own label names a button', async () => {
    const { control, host } = button('<span></span>', '<svg aria-label="Delete"></svg>')
    expect(await warned(() => auditName(host, () => control, ''))).toEqual([])
  })

  test('a host aria-label, an id it names, or a component that says so name it', async () => {
    for (const attributes of ['aria-label="Close"', 'aria-labelledby="named"']) {
      document.body.innerHTML = `<p id="named">Close</p><span ${attributes}></span>`
      const host = document.body.lastElementChild as HTMLElement
      expect(await warned(() => auditName(host, () => null, ''))).toEqual([])
    }
    document.body.innerHTML = '<span></span>'
    const host = document.body.lastElementChild as HTMLElement
    expect(
      await warned(() =>
        auditName(
          host,
          () => null,
          '',
          () => true,
        ),
      ),
    ).toEqual([])
  })

  test('a select that shows only its placeholder is reported', async () => {
    const { control, host } = button('<span></span>', '<span part="value" id="value">Choose</span>')
    control.setAttribute('aria-labelledby', 'value')
    const value = () => control.querySelector('[part="value"]')
    expect(await warned(() => auditName(host, () => control, '', undefined, value))).toHaveLength(1)
  })

  test('a control named only by its placeholder is reported as that', async () => {
    document.body.innerHTML = '<span></span>'
    const host = document.body.lastElementChild as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<input placeholder="#000000">'
    const control = root.querySelector('input') as HTMLElement
    expect(await warned(() => auditName(host, () => control, 'Give it a label.'))).toEqual([
      '<span> is named only by its placeholder, which is gone once a person types. Give it a label.',
    ])
  })

  test('words hidden from the reader name nothing', async () => {
    const { control, host } = button('<span></span>', '<span aria-hidden="true">x</span>')
    expect(await warned(() => auditName(host, () => control, ''))).toHaveLength(1)
  })

  /* A menu row whose page closed before the read draws no row, and was
     reported for a name it has. */
  test('a control not drawn at the read is read again when it next asks', async () => {
    const { control, host } = button('<span></span>', '')
    expect(await warned(() => auditName(host, () => undefined, ''))).toEqual([])
    expect(await warned(() => auditName(host, () => control, ''))).toHaveLength(1)
  })

  test('a host taken out before the read is not reported', async () => {
    const { control, host } = button('<span></span>', '')
    expect(
      await warned(() => {
        auditName(host, () => control, '')
        host.remove()
      }),
    ).toEqual([])
  })

  /* MixinField hands the audit nothing but itself, so its closures and its
     sentence ship in a development build only. */
  test('a field is read by its control, its label, and the part that shows its value', async () => {
    const field = (labeled: boolean, slotted: string): HTMLElement => {
      document.body.innerHTML = `<span>${slotted}</span>`
      const host = document.body.lastElementChild as HTMLElement
      const root = host.attachShadow({ mode: 'open' })
      root.innerHTML = '<input placeholder="Email">'
      return Object.assign(host, {
        labeled,
        namedControl: root.querySelector('input'),
        partNamed: () => null,
      })
    }
    expect(await warned(() => auditField(field(false, '')))).toEqual([
      '<span> is named only by its placeholder, which is gone once a person types. Give it a `label`, an `aria-label`, words in its label, or a `<label for>` that names it.',
    ])
    expect(await warned(() => auditField(field(true, '')))).toEqual([])
    expect(await warned(() => auditField(field(false, '<b slot="label">Email</b>')))).toEqual([])
  })

  /* Icon hands over itself and its label, so the lookup for the control it
     sits in ships in a development build only. */
  test('a control whose only content is an unnamed icon is reported for the icon', async () => {
    const icon = (control: string): HTMLElement => {
      document.body.innerHTML = control
      return document.body.querySelector('i') as HTMLElement
    }
    expect(await warned(() => auditIconControl(icon('<button><i></i></button>'), ''))).toEqual([
      '<button> has no accessible name, so a screen reader announces it by its role alone. Its only content is <i>, which is decorative: give the icon a `label`, or the control an `aria-label`.',
    ])
    expect(await warned(() => auditIconControl(icon('<button><i></i></button>'), 'Save'))).toEqual(
      [],
    )
    expect(await warned(() => auditIconControl(icon('<button><i></i>Save</button>'), ''))).toEqual(
      [],
    )
    expect(await warned(() => auditIconControl(icon('<div><i></i></div>'), ''))).toEqual([])
  })
})
