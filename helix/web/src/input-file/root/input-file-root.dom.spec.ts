import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputFile = HTMLElement & {
  clear(): void
  files: File[]
  removeAt(at: number): void
  updateComplete: Promise<unknown>
}

const field = async (attrs = ''): Promise<InputFile> => {
  const host = (await mount(`<helix-input-file label="Attachments" ${attrs}>
  </helix-input-file>`)) as InputFile
  await host.updateComplete
  return host
}

const control = (host: InputFile): HTMLInputElement => part(host, 'control') as HTMLInputElement

/** A `FileList` cannot be constructed, so it is built the way the platform does. */
const listOf = (...names: string[]): FileList => {
  const carrier = new DataTransfer()
  for (const name of names) {
    carrier.items.add(new File(['x'], name, { type: 'text/plain' }))
  }
  return carrier.files
}

const choose = async (host: InputFile, ...names: string[]): Promise<void> => {
  control(host).files = listOf(...names)
  control(host).dispatchEvent(new Event('change', { bubbles: true }))
  await host.updateComplete
}

describe('input file', () => {
  test('the control is a real file input, which is what opens a picker', async () => {
    // A dialog is a privileged action a script cannot start. It opens for a
    // click on the input or on a label pointing at one, and nothing else.
    const host = await field()
    expect(control(host).type).toBe('file')
    expect(part(host, 'trigger')?.getAttribute('for')).toBe(control(host).id)
  })

  test('the trigger is a label rather than a button, so there is one control', async () => {
    // A button beside a hidden input is two things a screen reader can find
    // where a reader sees one.
    const host = await field()
    expect(part(host, 'trigger')?.tagName).toBe('LABEL')
  })

  test('accept, multiple and capture reach the input', async () => {
    const host = await field('accept=".png" multiple capture="user"')
    expect(control(host).getAttribute('accept')).toBe('.png')
    expect(control(host).multiple).toBe(true)
    expect(control(host).getAttribute('capture')).toBe('user')
  })

  test('choosing files lists them by name', async () => {
    // A file input reports "3 files" and nothing else, which is no use for
    // checking that the right ones were picked.
    const host = await field('multiple')
    await choose(host, 'one.txt', 'two.txt')
    expect(host.files.map((file) => file.name)).toEqual(['one.txt', 'two.txt'])
    expect(
      [...(host.shadowRoot?.querySelectorAll('[part="name"]') ?? [])].map((n) => n.textContent),
    ).toEqual(['one.txt', 'two.txt'])
  })

  test('and says so under its own name, once', async () => {
    // The native `change` is stopped and relayed, so a consumer hears one event
    // from one element rather than two from two.
    const host = await field('multiple')
    const said: { name: string; value: string }[] = []
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ name: string; value: string }>).detail)
    })
    await choose(host, 'one.txt', 'two.txt')
    expect(said).toEqual([{ name: 'files', value: 'one.txt, two.txt' }])
  })

  test('one file can be taken back out, and the rest stay', async () => {
    const host = await field('multiple')
    await choose(host, 'one.txt', 'two.txt', 'three.txt')
    host.removeAt(1)
    await host.updateComplete
    expect(host.files.map((file) => file.name)).toEqual(['one.txt', 'three.txt'])
  })

  test('`removeAt`, because `remove` is the node one', async () => {
    // Shadowing `Element.remove` would break every caller who meant the node.
    const host = await field()
    expect(typeof host.removeAt).toBe('function')
    expect(host.remove).toBe(Element.prototype.remove)
  })

  test('clearing empties it', async () => {
    const host = await field('multiple')
    await choose(host, 'one.txt')
    host.clear()
    await host.updateComplete
    expect(host.files).toEqual([])
    expect(host.shadowRoot?.querySelector('[part="list"]')).toBeNull()
  })

  test('there is no list before anything is chosen', async () => {
    // A bare slot's worth of nothing, rather than an empty box under the field.
    const host = await field()
    expect(host.shadowRoot?.querySelector('[part="list"]')).toBeNull()
  })

  test('the field says when something is over it', async () => {
    // On an element in this shadow root, never on the host, which is markup a
    // consumer rendered.
    const host = await field()
    const box = part(host, 'field') as HTMLElement
    box.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
    await host.updateComplete
    expect(box.hasAttribute('data-dropping')).toBe(true)
    expect(host.hasAttribute('data-dropping')).toBe(false)

    box.dispatchEvent(new Event('dragleave', { bubbles: true }))
    await host.updateComplete
    expect((part(host, 'field') as HTMLElement).hasAttribute('data-dropping')).toBe(false)
  })

  test('a dragover is refused outright when disabled, so no drop can follow', async () => {
    const host = await field('disabled')
    const box = part(host, 'field') as HTMLElement
    const event = new Event('dragover', { bubbles: true, cancelable: true })
    box.dispatchEvent(event)
    await host.updateComplete
    // Not prevented means the browser keeps its own handling, which is what
    // stops the field pretending to accept something it will not take.
    expect(event.defaultPrevented).toBe(false)
    expect(box.hasAttribute('data-dropping')).toBe(false)
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to be resolved
    // in the same tree as the control that points at it.
    const host = await field('hint="Up to 10MB"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Up to 10MB')
  })
})
