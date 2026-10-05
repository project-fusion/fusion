import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Whether a control has a name, and the one warning when it has none.
 *
 * Imported after `registerDom()`, so the module reads happy-dom's `Node` and
 * `HTMLSlotElement` rather than bun's.
 */
let auditName: typeof import('./audit-name.js').auditName
let hasName: typeof import('./audit-name.js').hasName

beforeAll(async () => {
  registerDom()
  ;({ auditName, hasName } = await import('./audit-name.js'))
})

describe('the name estimate', () => {
  const inShadow = (content: string): HTMLElement => {
    document.body.innerHTML = '<span>Words</span>'
    const host = document.body.firstElementChild as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = content
    return root.firstElementChild as HTMLElement
  }

  test('reads an aria-label, a title, a placeholder and a label in the same tree', () => {
    expect(hasName(inShadow('<input aria-label="Email">'))).toBe(true)
    expect(hasName(inShadow('<input title="Email">'))).toBe(true)
    expect(hasName(inShadow('<input placeholder="Email">'))).toBe(true)
    expect(hasName(inShadow('<input id="i"><label for="i">Email</label>'))).toBe(true)
    expect(hasName(inShadow('<input aria-labelledby="l"><span id="l">Email</span>'))).toBe(true)
    expect(hasName(inShadow('<input aria-labelledby="l"><span id="l"></span>'))).toBe(false)
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

  test('words hidden from the reader name nothing', async () => {
    const { control, host } = button('<span></span>', '<span aria-hidden="true">x</span>')
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
})
