import { beforeAll, describe, expect, test } from 'bun:test'
import { trash } from '@fusion.dev/helix-icons'
import { formValue, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the page exists, as the element is. */
let HelixRejectEvent: typeof import('@fusion.dev/helix-core').HelixRejectEvent
type HelixRejectEvent = import('@fusion.dev/helix-core').HelixRejectEvent

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  ;({ HelixRejectEvent } = await import('@fusion.dev/helix-core'))
})

type InputFile = HTMLElement & {
  clear(): void
  files: File[]
  removeAt(at: number): void
  updateComplete: Promise<unknown>
}

const field = async (attrs = ''): Promise<InputFile> => {
  const host = (await mount(`<helix-headless-file-input label="Attachments" ${attrs}>
  </helix-headless-file-input>`)) as InputFile
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
    const said: { value: string }[] = []
    host.addEventListener('helix-before-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail)
    })
    await choose(host, 'one.txt', 'two.txt')
    expect(said).toEqual([{ value: 'one.txt, two.txt' }])
  })

  test('and refusing that says nothing moves, in either direction', async () => {
    /* The `@event` line promised a request fired before the files change and
       refusable. It was dispatched from `announce`, after the input had taken
       them and after `setFormValue` had reported them, and what the dispatch
       returned was thrown away: a veto with no reader.

       Two directions, because the four paths in split that way. A pick is the
       browser writing the input before this element hears anything, so a
       refusal has to put the previous list back; a removal is this element's
       own write, so a refusal is it never happening. */
    const host = await field('multiple')
    await choose(host, 'one.txt', 'two.txt')
    const refuse = (event: Event): void => event.preventDefault()
    host.addEventListener('helix-before-change', refuse)

    await choose(host, 'three.txt')
    expect(host.files.map((file) => file.name)).toEqual(['one.txt', 'two.txt'])

    host.removeAt(0)
    await host.updateComplete
    expect(host.files.map((file) => file.name)).toEqual(['one.txt', 'two.txt'])

    host.clear()
    await host.updateComplete
    expect(host.files.map((file) => file.name)).toEqual(['one.txt', 'two.txt'])
  })

  test('each file carries its size and its kind', async () => {
    const host = await field('multiple')
    control(host).files = (() => {
      const carrier = new DataTransfer()
      carrier.items.add(new File(['x'.repeat(2048)], 'shot.png', { type: 'image/png' }))
      carrier.items.add(new File(['x'], 'notes.txt', { type: 'text/plain' }))
      return carrier.files
    })()
    control(host).dispatchEvent(new Event('change', { bubbles: true }))
    await host.updateComplete
    const read = (part: string) =>
      [...(host.shadowRoot?.querySelectorAll(`[part="${part}"]`) ?? [])].map((one) =>
        one.textContent?.trim(),
      )
    // Two readings of a file rather than a sentence about it, so two tags.
    expect(read('size')).toEqual(['2 KB', '1 byte'])
    // The extension, which is the word a reader has: a text file's subtype is
    // `plain`, and a Word document's is a 59-character vendor string.
    expect(read('kind')).toEqual(['PNG', 'TXT'])
  })

  test('one byte is a byte', async () => {
    const host = await field()
    control(host).files = (() => {
      const carrier = new DataTransfer()
      carrier.items.add(new File(['x'], 'tiny.txt', { type: 'text/plain' }))
      return carrier.files
    })()
    control(host).dispatchEvent(new Event('change', { bubbles: true }))
    await host.updateComplete
    expect(part(host, 'size')?.textContent?.trim()).toBe('1 byte')
  })

  test('and a file the browser cannot name falls back to its extension', async () => {
    // `type` is empty for anything unrecognized, and the extension is what the
    // name already shows: a poor label and a better one than nothing.
    const host = await field()
    control(host).files = (() => {
      const carrier = new DataTransfer()
      carrier.items.add(new File(['x'], 'archive.weird', { type: '' }))
      return carrier.files
    })()
    control(host).dispatchEvent(new Event('change', { bubbles: true }))
    await host.updateComplete
    expect(part(host, 'kind')?.textContent?.trim()).toBe('WEIRD')
  })

  test('the two readings are tags, not a line of text', async () => {
    const host = await field()
    await choose(host, 'one.txt')
    expect(part(host, 'size')?.tagName.toLowerCase()).toBe('helix-headless-tag')
    expect(part(host, 'kind')?.tagName.toLowerCase()).toBe('helix-headless-tag')
  })

  test('the remove control is a trash can, because taking a file out is a delete', async () => {
    // A cross says "dismiss this", which is what a tag does. This is not that.
    const host = await field()
    await choose(host, 'one.txt')
    // The glyph is an inlined `<svg>` from a named import, not an element with
    // a name: `helix-headless-icon` indexed the whole set at runtime.
    expect(part(host, 'remove')?.querySelector('svg')?.innerHTML).toContain(
      trash.content.slice(0, 40),
    )
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

  test('the hint sits under the field, and the list after it', async () => {
    /* A hint is instruction for the next action rather than a note about the
       result, and under the list its position moves down a card at a time as
       files are added: the one piece of guidance the control carries would
       never be twice in the same place. Feedback stands in place of the hint,
       so an error about a refused file lands against the control that refused
       it rather than below the ones that were not. */
    const host = await field('hint="Up to 10MB" multiple')
    await choose(host, 'one.txt', 'two.txt')
    const nodes = [...(host.shadowRoot?.children ?? [])]
    const at = (name: string) => nodes.findIndex((one) => one.getAttribute('part') === name)
    expect(at('field')).toBeLessThan(at('hint'))
    expect(at('hint')).toBeLessThan(at('list'))
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

  test('each remove control is named for the file it removes', async () => {
    /* One row per file and a glyph-only control on each, so the name has to
       carry the file as well as the verb: three buttons all announcing "Remove"
       is a list a reader cannot choose from by ear.

       A sentence the component does not default to, since `removeLabel` holds
       "Remove {name}" and asserting that would pass against a template writing
       it. The name goes where the sentence puts it, not after it. */
    const host = await field('remove-label="Take {name} off"')
    await choose(host, 'one.txt', 'two.txt')
    const names = [...(host.shadowRoot?.querySelectorAll('[part~="remove"]') ?? [])].map((one) =>
      one.getAttribute('aria-label'),
    )
    expect(names).toEqual(['Take one.txt off', 'Take two.txt off'])
  })

  test('a remove label with no place for the name has the name after it', async () => {
    // How one written before `{name}` existed was always read.
    const host = await field('remove-label="Delete"')
    await choose(host, 'one.txt')
    const remove = host.shadowRoot?.querySelector('[part~="remove"]')
    expect(remove?.getAttribute('aria-label')).toBe('Delete one.txt')
  })

  test('the size beside a file is written in the locale the consumer named', async () => {
    /* A file size is a number with a unit, and the decimal separator is not the
       same everywhere: a French reader is owed `1,5 ko` and an English one
       `1.5 kB`. Read off the page instead of this property, a list served from
       a shared renderer comes back in whatever that machine defaults to. */
    const kilobyte = (host: InputFile): void => {
      const carrier = new DataTransfer()
      carrier.items.add(new File(['x'.repeat(1500)], 'one.txt', { type: 'text/plain' }))
      control(host).files = carrier.files
      control(host).dispatchEvent(new Event('change', { bubbles: true }))
    }
    const size = (host: InputFile): string =>
      host.shadowRoot?.querySelector('[part~="size"]')?.textContent?.trim() ?? ''

    const french = await field('locale="fr-FR"')
    kilobyte(french)
    await french.updateComplete
    const english = await field('locale="en-US"')
    kilobyte(english)
    await english.updateComplete

    expect(size(english)).toBe('1.5 KB')
    expect(size(french)).not.toBe(size(english))
  })
})

describe('the type tag', () => {
  test('is the extension, never a vendor string', async () => {
    const host = await field()
    control(host).files = (() => {
      const carrier = new DataTransfer()
      carrier.items.add(
        new File(['x'], 'report.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      )
      return carrier.files
    })()
    control(host).dispatchEvent(new Event('change', { bubbles: true }))
    await host.updateComplete
    expect(part(host, 'kind')?.textContent?.trim()).toBe('DOCX')
  })
})

describe('what the form is told', () => {
  /* Only a pick and the first render reported, so a renamed field submitted
     under its old name and a field no longer required stayed invalid. */
  test('follows a new name', async () => {
    const host = (await field('name="first"')) as InputFile & { name: string }
    await choose(host, 'one.txt')
    host.name = 'second'
    await host.updateComplete
    expect([...(formValue(host) as FormData).keys()]).toEqual(['second'])
  })

  test('and a required that is taken off', async () => {
    const host = (await field('required')) as InputFile & {
      required: boolean
      validity: ValidityState
    }
    control(host).required = true
    host.required = false
    await host.updateComplete
    expect(host.validity.valid).toBe(true)
  })
})

describe('a drop', () => {
  const drop = async (host: InputFile, ...files: File[]): Promise<void> => {
    const carrier = new DataTransfer()
    for (const file of files) {
      carrier.items.add(file)
    }
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
    Object.defineProperty(event, 'dataTransfer', { value: carrier })
    part(host, 'field')?.dispatchEvent(event)
    await host.updateComplete
  }

  /* `accept` filters the picker and nothing else, so a text file dropped on an
     image field was listed, valid, and submitted. */
  test('takes only what accept lists', async () => {
    const host = await field('accept="image/*,.pdf" multiple')
    await drop(
      host,
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
      new File(['x'], 'shot.png', { type: 'image/png' }),
      new File(['x'], 'paper.PDF', { type: 'application/pdf' }),
    )
    expect(host.files.map((file) => file.name)).toEqual(['shot.png', 'paper.PDF'])
  })
})

describe('removing a file from the list', () => {
  /* The button goes with its file, and focus went with it to the page's body. */
  test('keeps focus in the field once the last file is gone', async () => {
    const host = await field()
    await choose(host, 'one.txt')
    ;(part(host, 'remove') as HTMLButtonElement).click()
    await host.updateComplete
    await host.updateComplete
    expect(host.shadowRoot?.activeElement).toBe(control(host))
  })

  test('and moves to the file that took its place', async () => {
    const host = await field('multiple')
    await choose(host, 'one.txt', 'two.txt')
    ;(part(host, 'remove') as HTMLButtonElement).click()
    await host.updateComplete
    await host.updateComplete
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'remove'))
  })
})

describe('screening the files that arrive', () => {
  type Screening = InputFile & { files: File[]; validate?: (file: File) => string | null }
  const sized = (name: string, size: number, type = 'text/plain'): File =>
    new File([new Uint8Array(size)], name, { type })
  const dropOn = async (host: InputFile, files: File[]): Promise<void> => {
    const carrier = new DataTransfer()
    for (const file of files) {
      carrier.items.add(file)
    }
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
    Object.defineProperty(event, 'dataTransfer', { value: carrier })
    part(host, 'field')?.dispatchEvent(event)
    await host.updateComplete
  }
  const rejected = (host: InputFile): string[][] => {
    const heard: string[][] = []
    host.addEventListener('helix-reject', (event) => {
      const { files } = (event as CustomEvent<{ files: { file: File; reason: string }[] }>).detail
      heard.push(files.map((one) => `${one.file.name}:${one.reason}`))
    })
    return heard
  }

  /* Zag's file upload: maxFiles, maxFileSize, a validate hook and a rejected
     event. A refused file used to vanish with no signal. */
  test('a drop past max-files or max-file-size is cut, and each refusal is reported', async () => {
    const host = (await field('multiple max-files="2" max-file-size="50"')) as Screening
    const heard = rejected(host)
    await dropOn(host, [
      sized('a.txt', 10),
      sized('big.txt', 99),
      sized('b.txt', 10),
      sized('c.txt', 10),
    ])
    expect(host.files.map((file) => file.name)).toEqual(['a.txt', 'b.txt'])
    expect(heard).toEqual([['big.txt:size', 'c.txt:count']])
  })

  test('validate refuses a file with its own reason, from the picker too', async () => {
    const host = (await field('multiple')) as Screening
    host.validate = (file) => (file.name.startsWith('draft') ? 'Drafts cannot be attached' : null)
    let message = ''
    host.addEventListener('helix-reject', (event) => {
      message =
        (event as CustomEvent<{ files: { message?: string }[] }>).detail.files[0]?.message ?? ''
    })
    await choose(host, 'draft.txt', 'final.txt')
    expect(host.files.map((file) => file.name)).toEqual(['final.txt'])
    expect(message).toBe('Drafts cannot be attached')
  })

  test('a refusal is a HelixRejectEvent, which nothing can cancel', async () => {
    const host = await field('accept="image/*"')
    let heard: Event | undefined
    host.addEventListener('helix-reject', (event) => {
      heard = event
    })
    await dropOn(host, [sized('notes.txt', 10)])
    expect(heard).toBeInstanceOf(HelixRejectEvent)
    expect(heard?.cancelable).toBe(false)
    expect((heard as HelixRejectEvent).detail.files.map((one) => one.reason)).toEqual(['type'])
  })

  test('several refusals are said as the page lists them, with commas in English', async () => {
    const host = await field('multiple accept="image/*"')
    await dropOn(host, [sized('notes.txt', 10), sized('todo.txt', 10), sized('plan.md', 10)])
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('Not added: notes.txt, todo.txt, plan.md')
  })

  test('a refusal is said in a live region, with the names filled in', async () => {
    const host = await field('accept="image/*" rejected-text="{count} left out: {names}"')
    expect(part(host, 'live')).toBeNull()
    await dropOn(host, [sized('notes.txt', 10)])
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('1 left out: notes.txt')
    expect(part(host, 'live')?.getAttribute('role')).toBe('status')
  })

  test('a drop that is wholly refused changes nothing and sends no change', async () => {
    const host = await field('accept="image/*"')
    let changes = 0
    host.addEventListener('change', () => {
      changes += 1
    })
    await dropOn(host, [sized('notes.txt', 10)])
    expect(changes).toBe(0)
  })

  test('a refused drop or paste on a single-file field keeps the file it holds', async () => {
    const host = (await field('accept="image/*"')) as Screening
    let changes = 0
    host.addEventListener('change', () => {
      changes += 1
    })
    await dropOn(host, [sized('a.png', 10, 'image/png')])
    expect(host.files.map((file) => file.name)).toEqual(['a.png'])
    await dropOn(host, [sized('notes.txt', 10)])
    expect(host.files.map((file) => file.name)).toEqual(['a.png'])
    const carrier = new DataTransfer()
    carrier.items.add(sized('todo.txt', 4))
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(event, 'clipboardData', { value: carrier })
    part(host, 'field')?.dispatchEvent(event)
    await host.updateComplete
    expect(host.files.map((file) => file.name)).toEqual(['a.png'])
    expect(changes).toBe(1)
  })

  test('files pasted onto the field are taken as a drop is', async () => {
    const host = (await field('multiple')) as Screening
    const carrier = new DataTransfer()
    carrier.items.add(sized('pasted.txt', 4))
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(event, 'clipboardData', { value: carrier })
    part(host, 'field')?.dispatchEvent(event)
    await host.updateComplete
    expect(host.files.map((file) => file.name)).toEqual(['pasted.txt'])
    expect(event.defaultPrevented).toBe(true)
  })
})

describe('your own rows and your own step', () => {
  type Shaping = HTMLElement & {
    files: File[]
    renderFile?: (file: File, index: number) => unknown
    transformFiles?: (files: File[]) => File[] | Promise<File[]>
    updateComplete: Promise<unknown>
  }
  const text = (name: string): File => new File(['x'], name, { type: 'text/plain' })
  const dropOn = async (host: HTMLElement, files: File[]): Promise<void> => {
    const carrier = new DataTransfer()
    for (const file of files) {
      carrier.items.add(file)
    }
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
    Object.defineProperty(event, 'dataTransfer', { value: carrier })
    part(host, 'field')?.dispatchEvent(event)
    await new Promise((done) => setTimeout(done, 0))
    await (host as Shaping).updateComplete
  }

  /* Zag's file upload lets a consumer draw each item. The row was name, size
     and type, and only a subclass could change it. */
  test('renderFile draws each row, and the remove button stays', async () => {
    const host = (await field('multiple')) as Shaping
    host.renderFile = (file, index) => `${index + 1}. ${file.name}`
    await dropOn(host, [text('a.txt'), text('b.txt')])
    const rows = [...(host.shadowRoot?.querySelectorAll('[part="detail"]') ?? [])]
    expect(rows.map((row) => row.textContent?.trim())).toEqual(['1. a.txt', '2. b.txt'])
    expect(host.shadowRoot?.querySelectorAll('[part="remove"]').length).toBe(2)
    expect(part(host, 'name')).toBeNull()
  })

  /* Zag's transformFiles. */
  test('transformFiles changes the files taken before the field holds them', async () => {
    const host = (await field('multiple')) as Shaping
    host.transformFiles = async (files) => files.map((file) => text(`small-${file.name}`))
    await dropOn(host, [text('a.txt')])
    expect(host.files.map((file) => file.name)).toEqual(['small-a.txt'])
    await dropOn(host, [text('b.txt')])
    expect(host.files.map((file) => file.name)).toEqual(['small-a.txt', 'small-b.txt'])
  })

  test('and a transform that fails refuses its files, with its message', async () => {
    const host = (await field('multiple')) as Shaping
    host.transformFiles = () => Promise.reject(new Error('Too large to shrink'))
    const heard: string[] = []
    host.addEventListener('helix-reject', (event) => {
      const { files } = (event as CustomEvent<{ files: { file: File; message?: string }[] }>).detail
      heard.push(...files.map((one) => `${one.file.name}:${one.message}`))
    })
    await dropOn(host, [text('a.txt')])
    await new Promise((done) => setTimeout(done, 0))
    expect(host.files).toEqual([])
    expect(heard).toEqual(['a.txt:Too large to shrink'])
  })
})
