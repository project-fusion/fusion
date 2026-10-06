import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../../index.js')
})

const wired = `
  <helix-sandbox>
    <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
    <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
  </helix-sandbox>`

/** A sandbox with something in the panel, which its dividers depend on. */
const withPanel = `
  <helix-sandbox>
    <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
    <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
    <helix-sandbox-terminal slot="panel"></helix-sandbox-terminal>
  </helix-sandbox>`

const withCss = `
  <helix-sandbox>
    <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
    <helix-sandbox-source slot="source" name="css" value="p { color: red }"></helix-sandbox-source>
    <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
  </helix-sandbox>`

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/**
 * A message that looks like it came from the frame.
 *
 * `Object.defineProperty`, not assignment. `origin` and `source` are readonly
 * getters on `MessageEvent`, so `Object.assign` throws `TypeError` in a browser
 * and only ever worked because happy-dom does not define them that way: three
 * specs here passed under it and threw the moment they ran in Chromium.
 *
 * `origin` could go through the constructor. `source` cannot, because the
 * platform requires a real `WindowProxy` there and these specs stub
 * `contentWindow` with a plain object on purpose, the assertion being about
 * identity rather than about frames. Defining an own property shadows the
 * prototype's getter, which is what a synthetic event needs.
 */
const fromFrame = (source: unknown, origin: string, data: unknown): MessageEvent => {
  const event = new MessageEvent('message', { data })
  Object.defineProperties(event, {
    origin: { value: origin },
    source: { value: source },
  })
  return event
}

describe('sandbox coordination', () => {
  test('an edit in the source reaches the preview', async () => {
    // By event, like the accordion. Neither child knows the other exists.
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & { source: string }

    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = '<p>two</p>'
    field.dispatchEvent(new Event('input'))
    await preview.updateComplete

    expect(preview.source).toBe('<p>two</p>')
  })

  test('a stylesheet pane reaches the preview separately from the markup', async () => {
    // The panes are told apart by name. Without it the root would have to
    // identify senders by reference, which couples it to how they are arranged.
    const sandbox = await mount(withCss)
    const css = [...sandbox.querySelectorAll('helix-sandbox-source')].find(
      (pane) => pane.getAttribute('name') === 'css',
    ) as Updatable
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & {
      source: string
      styles: string
    }

    // Seeded from the markup pane, and set here too so the assertion below
    // reads what this test wrote.
    preview.source = '<p>one</p>'
    await preview.updateComplete

    const field = css.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = 'p { color: rebeccapurple }'
    field.dispatchEvent(new Event('input'))
    await preview.updateComplete

    expect(preview.styles).toBe('p { color: rebeccapurple }')
    // The markup pane is untouched: they are told apart by name.
    expect(preview.source).toBe('<p>one</p>')
  })

  /* The sandbox listens from connection, before any listener a page adds, and
     it forwarded the value during the dispatch: the source kept the old text
     while the preview drew the refused one. */
  test('a refused edit stays out of the preview', async () => {
    const sandbox = await mount(wired)
    sandbox.addEventListener('helix-before-edit', (event) => event.preventDefault())
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable & { value: string }
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & { source: string }
    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = '<p>refused</p>'
    field.dispatchEvent(new Event('input'))
    await preview.updateComplete
    expect(source.value).toBe('<p>one</p>')
    expect(preview.source).toBe('<p>one</p>')
  })

  /* Only edits were forwarded, so the text had to be written twice: once in the
     pane and again on the preview. */
  test('a pane written with a value fills the preview before any edit', async () => {
    const sandbox = await mount(withCss)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & {
      source: string
      styles: string
    }
    expect(preview.source).toBe('<p>one</p>')
    expect(preview.styles).toBe('p { color: red }')
  })

  test('and a preview given its own source keeps it until the first edit', async () => {
    const sandbox = await mount(`
      <helix-sandbox>
        <helix-sandbox-source slot="source" name="html" value="<p>pane</p>"></helix-sandbox-source>
        <helix-sandbox-preview slot="preview" source="<p>own</p>"></helix-sandbox-preview>
      </helix-sandbox>`)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & { source: string }
    expect(preview.source).toBe('<p>own</p>')
  })

  test('the preview is a frame, and renders nothing into the page', async () => {
    // An example rendered into the page is styled by whatever surrounds it,
    // which flatters the preview and lies about it. It also leaves nothing to
    // capture console output from.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & {
      source: string
      src: string
    }
    preview.src = '/frame'
    preview.source = '<h2>Heading</h2>'
    await preview.updateComplete

    expect(preview.shadowRoot?.querySelector('iframe')).not.toBeNull()
    expect(preview.querySelector('h2')).toBeNull()
    expect(preview.innerHTML).toBe('')
  })

  test('the frame is named, so it is not announced as an unlabelled frame', async () => {
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable
    expect(preview.shadowRoot?.querySelector('iframe')?.getAttribute('title')).toBe('Preview')
  })

  test('a console call in the frame arrives as an event on the host', async () => {
    // The terminal's whole source. A message from any other window is not this
    // preview's, and neither is one carrying a real origin: the frame is
    // sandboxed, so everything it genuinely sends arrives as `"null"`. A named
    // origin means the frame has navigated somewhere else and that somewhere is
    // writing lines as though the example had logged them.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable
    const frame = preview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement
    const sender = {}
    Object.defineProperty(frame, 'contentWindow', { value: sender })

    const heard: string[] = []
    preview.addEventListener('helix-console', (event) => {
      const { level, text } = (event as CustomEvent<{ level: string; text: string }>).detail
      heard.push(`${level}: ${text}`)
    })

    const post = (source: unknown, origin: string) =>
      window.dispatchEvent(
        fromFrame(source, origin, {
          level: 'warn',
          text: 'from the example',
          type: 'helix-preview-console',
        }),
      )

    post(sender, 'null')
    post({}, 'null')
    post(sender, 'https://elsewhere.test')
    // Not `window.location.origin`: happy-dom runs on `about:blank`, so its
    // origin is `"null"` and posting with it is a valid message, not a
    // rejected one.

    expect(heard).toEqual(['warn: from the example'])
  })

  test('the layout and direction go to the frame, not onto the host', async () => {
    // Spacing around an example belongs to the document the example is in.
    // Padding on the host would sit outside the frame, where no layout mode
    // could reach it.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & {
      direction: string
      layout: string
    }
    const frame = preview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement
    const sent: Record<string, unknown>[] = []
    Object.defineProperty(frame, 'contentWindow', {
      value: { postMessage: (message: Record<string, unknown>) => sent.push(message) },
    })

    window.dispatchEvent(fromFrame(frame.contentWindow, 'null', { type: 'helix-preview-ready' }))

    preview.layout = 'centered'
    preview.direction = 'rtl'
    await preview.updateComplete

    const last = sent.at(-1)
    expect(last?.layout).toBe('centered')
    expect(last?.direction).toBe('rtl')
    /* And the second half of the sentence, which nothing here used to check:
       both reflected, so a script setting either wrote an attribute onto markup
       the consumer's server never sent, for a value no rule on this side of the
       frame can read. */
    expect(preview.hasAttribute('layout')).toBe(false)
    expect(preview.hasAttribute('direction')).toBe(false)
  })

  test('the frame is answered at a wildcard, because a sandbox has no origin to name', async () => {
    // A sandboxed frame has an opaque origin, and `postMessage` has no target
    // string that names one, so `'*'` is the only thing that delivers. It costs
    // nothing, because what is sent is the example's own source going to the
    // document about to render it. What guards the other direction is the
    // origin check on the way back in.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable
    const frame = preview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement
    const origins: string[] = []
    Object.defineProperty(frame, 'contentWindow', {
      value: { postMessage: (_: unknown, origin: string) => origins.push(origin) },
    })

    window.dispatchEvent(fromFrame(frame.contentWindow, 'null', { type: 'helix-preview-ready' }))

    expect(origins).toEqual(['*'])
  })

  test('nothing is sent until the frame says it is listening', async () => {
    // A document that has not loaded has no listener, so a render posted at it
    // is lost and the preview stays empty until something else moves.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & {
      source: string
      src: string
    }
    const frame = preview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement
    let posted = 0
    Object.defineProperty(frame, 'contentWindow', {
      value: {
        postMessage: () => {
          posted += 1
        },
      },
    })

    preview.source = '<p>x</p>'
    await preview.updateComplete
    expect(posted).toBe(0)
  })
})

type Splitter = HTMLElement & {
  defaultPosition: number
  position: number
  updateComplete: Promise<unknown>
}

/** The two splitters the sandbox arranges: the panes inside the panel. */
const panes = (host: HTMLElement): Splitter => part(host, 'panes') as Splitter
const body = (host: HTMLElement): Splitter => part(host, 'body') as Splitter
const bar = (splitter: Splitter): HTMLElement =>
  splitter.shadowRoot?.querySelector('[part="separator"]') as HTMLElement

/** For what only a measured box can answer. See its one use below. */
const browser = hasLayout() ? test : (): void => {}

describe('sandbox dividers', () => {
  const press = async (
    host: Updatable,
    splitter: Splitter,
    key: string,
  ): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    bar(splitter).dispatchEvent(event)
    await splitter.updateComplete
    await host.updateComplete
    return event
  }

  test('two splitters, the panes nested inside the panel', async () => {
    // The order is what makes the panel span the full width: the outer divider
    // runs edge to edge and the inner one stops at it.
    const sandbox = await mount(wired)
    expect(body(sandbox).tagName).toBe('HELIX-SPLITTER')
    expect(panes(sandbox).tagName).toBe('HELIX-SPLITTER')
    expect(body(sandbox).getAttribute('orientation')).toBe('vertical')
    expect(panes(sandbox).contains(part(sandbox, 'pane') as Node)).toBe(true)
    expect(body(sandbox).contains(panes(sandbox))).toBe(true)
  })

  test('the panes divider reports the split it was given', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    expect(bar(panes(sandbox)).getAttribute('role')).toBe('separator')
    // Whatever the split is, not whatever number it happens to start at.
    expect(bar(panes(sandbox)).getAttribute('aria-valuenow')).toBe(String(sandbox.split))
    expect(bar(panes(sandbox)).getAttribute('tabindex')).toBe('0')
  })

  test('arrow keys move the split, and the sandbox is what answers', async () => {
    // The splitter is controlled from here, so it applies nothing on its own:
    // it announces, this sets `split`, and the number it reports is the truth.
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const start = sandbox.split
    await press(sandbox, panes(sandbox), 'ArrowRight')
    const step = sandbox.split - start
    expect(step).toBeGreaterThan(0)
    expect(panes(sandbox).position).toBe(sandbox.split)

    await press(sandbox, panes(sandbox), 'ArrowLeft')
    await press(sandbox, panes(sandbox), 'ArrowLeft')
    expect(sandbox.split).toBe(start - step)
  })

  test('the split reaches both ends and stops there', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    await press(sandbox, panes(sandbox), 'Home')
    expect(sandbox.split).toBe(0)

    await press(sandbox, panes(sandbox), 'End')
    expect(sandbox.split).toBe(100)

    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(sandbox.split).toBe(100)
  })

  test('a split that is not a number falls back rather than breaking the layout', async () => {
    // A consumer passes `undefined` to mean "the default", and a split that is
    // not a number has to fall back rather than reach the layout.
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    sandbox.split = undefined as unknown as number
    await sandbox.updateComplete
    expect(panes(sandbox).position).toBe(50)

    sandbox.split = Number.NaN
    await sandbox.updateComplete
    expect(panes(sandbox).position).toBe(50)

    sandbox.split = 30
    await sandbox.updateComplete
    expect(panes(sandbox).position).toBe(30)
  })

  test('a reset goes to the declared home, not to wherever it opened', async () => {
    /* Home is never captured from `split` on the first render. That is the
       arrangement the consumer declared only when nobody owns the property, and
       the workbench owns it and restores it from storage, so home would be the
       reader's last session and a double click would reset the sandbox to the
       size it already had. */
    /* Opened at 30, which is what restoring a session looks like from in here:
       the value is there on the first render, and it is not a declaration. */
    const sandbox = (await mount(`
      <helix-sandbox split="30">
        <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
        <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
      </helix-sandbox>`)) as Updatable & { split: number }
    await sandbox.updateComplete
    expect(panes(sandbox).position).toBe(30)
    expect(panes(sandbox).defaultPosition).toBe(50)

    /* And still, after the property it is not has moved again. */
    sandbox.split = 72
    await sandbox.updateComplete
    expect(panes(sandbox).defaultPosition).toBe(50)
  })

  test('and the consumer can say where home is', async () => {
    const sandbox = (await mount(`
      <helix-sandbox default-split="30">
        <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
        <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
      </helix-sandbox>`)) as Updatable & { split: number }
    await sandbox.updateComplete
    expect(panes(sandbox).defaultPosition).toBe(30)
  })

  test('the panel divider is only there when there is a panel to size', async () => {
    // A boundary needs two sides. The element stays and the stylesheet hides it,
    // which is a paint a browser has to check; this covers the flag it reads.
    // On the splitter, never on the host: `hasPanel` is answered at hydration,
    // so an attribute here that the server's markup lacked is a mismatch React
    // reports and refuses to patch. Measured on the real site before it moved.
    const bare = await mount(wired)
    expect(bare.hasAttribute('data-panel')).toBe(false)
    expect(body(bare).hasAttribute('data-panel')).toBe(false)

    const full = await mount(withPanel)
    expect(full.hasAttribute('data-panel')).toBe(false)
    expect(body(full).hasAttribute('data-panel')).toBe(true)
  })

  test('the corner arrives on its own where the two dividers cross', async () => {
    const sandbox = (await mount(withPanel)) as Updatable
    await body(sandbox).updateComplete
    await sandbox.updateComplete
    expect(body(sandbox).shadowRoot?.querySelector('[part="corner"]')).not.toBeNull()
  })

  test('and not when the panes are stacked, where the two run parallel', async () => {
    const sandbox = (await mount(
      withPanel.replace('<helix-sandbox>', '<helix-sandbox orientation="vertical">'),
    )) as Updatable
    await body(sandbox).updateComplete
    await sandbox.updateComplete
    expect(body(sandbox).shadowRoot?.querySelector('[part="corner"]')).toBeNull()
  })

  test('the axis reaches the splitter and writes nothing on the host', async () => {
    /* `lead` says in its own docblock that nothing selects on it and so it does
       not reflect; `orientation` reflected anyway, for a value this sheet names
       in no rule. The axis is the inner splitter's, which is where the panes
       are laid out. */
    const sandbox = (await mount(wired)) as Updatable & { orientation: string }
    sandbox.orientation = 'vertical'
    await sandbox.updateComplete
    expect(panes(sandbox).getAttribute('orientation')).toBe('vertical')
    expect(sandbox.hasAttribute('orientation')).toBe(false)
  })

  const heard = (sandbox: Updatable): string[] => {
    const named: string[] = []
    for (const name of [
      'helix-before-collapse',
      'helix-before-panel-resize',
      'helix-before-resize',
      'helix-before-split',
    ]) {
      sandbox.addEventListener(name, (event) => {
        named.push(event.type)
      })
    }
    return named
  }

  test('the arrangement is announced once, and the splitters inside are not', async () => {
    /* A consumer stores one arrangement. What the two elements inside said to
       each other on the way there is not their business, so each divider has
       its own verb. `helix-before-resize` is listened for here precisely
       because the sandbox must never send one: a splitter inside it that got
       out would land under that name. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const named = heard(sandbox)
    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(named).toEqual(['helix-before-split'])
  })

  test('and a divider driven to the end says the same one thing, the collapse never getting out', async () => {
    /* `start` and `end` name the panes of a splitter a consumer of this element
       is not supposed to know about, and the collapse is a second state this
       element has nowhere to put: refused and stopped, so what a reader hears
       is the share they already store. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const named = heard(sandbox)
    await press(sandbox, panes(sandbox), 'End')
    expect(sandbox.split).toBe(100)
    expect(named).toEqual(['helix-before-split'])
    expect(panes(sandbox).hasAttribute('data-collapsed')).toBe(false)
  })

  /**
   * Announced before it is applied, which is what `before` has to mean.
   *
   * Both of these were dispatched after `split` and `panelSize` had been
   * written, with the answer dropped, so `preventDefault()` on an event whose
   * own line says refusing it takes the decision did nothing at all: the
   * divider stayed where the drag left it and the handler read a value it had
   * just declined. `SandboxSource.edit` carries the argument in this same
   * family, and `Splitter` has always announced through the audited path.
   */
  test('a refused split leaves the divider where it was', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const start = sandbox.split
    let proposed = ''
    sandbox.addEventListener('helix-before-split', (event) => {
      proposed = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })

    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(Number(proposed)).toBeGreaterThan(start)
    expect(sandbox.split).toBe(start)
    expect(panes(sandbox).position).toBe(start)
  })

  test('a split that moved is announced again once it has, and a refused one is not', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const settled: string[] = []
    sandbox.addEventListener('helix-split', (event) => {
      settled.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(settled).toEqual([String(sandbox.split)])

    sandbox.addEventListener('helix-before-split', (event) => event.preventDefault())
    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(settled).toHaveLength(1)
  })

  /* Browser only: the panel is pixels and the divider is a share, so the
     conversion between them needs a measured body and happy-dom has none. With
     no height the handler returns before it proposes anything, which is a test
     that passes whatever this element does. */
  browser('and a refused panel resize leaves the panel its height', async () => {
    const sandbox = (await mount(withPanel)) as Updatable & { panelSize: number }
    const start = sandbox.panelSize
    let proposed = ''
    sandbox.addEventListener('helix-before-panel-resize', (event) => {
      proposed = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })

    await press(sandbox, body(sandbox), 'ArrowUp')
    expect(proposed).not.toBe('')
    expect(Number(proposed)).not.toBe(start)
    expect(sandbox.panelSize).toBe(start)
  })

  browser('a panel that moved is announced again at its new height', async () => {
    const sandbox = (await mount(withPanel)) as Updatable & { panelSize: number }
    const settled: string[] = []
    sandbox.addEventListener('helix-panel-resize', (event) => {
      settled.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await press(sandbox, body(sandbox), 'ArrowUp')
    expect(settled).toEqual([String(sandbox.panelSize)])
  })

  /**
   * **`panel-collapsed-size` is a floor, which is how this element spells
   * "shut".**
   *
   * Browser only, for the reason above: the panel is pixels and the divider a
   * share. The splitter inside reaches its collapse now rather than returning on
   * the refusal above, and that collapse is refused here, so what is left is one
   * number in the units a consumer stores. Measured in Chromium 17 Sep 2026 on
   * the shipped `with-a-panel` example, which sets 36 and whose summary calls
   * the panel collapsible: its panel box was 0px with the divider driven to the
   * end, and 36px once the floor below held it.
   */
  browser('a panel driven to the end stops at the sliver it was told to leave', async () => {
    const sandbox = (await mount(`
      <helix-sandbox panel-collapsed-size="36">
        <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
        <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
        <helix-sandbox-terminal slot="panel"></helix-sandbox-terminal>
      </helix-sandbox>`)) as Updatable & { panelSize: number }
    const named = heard(sandbox)

    await press(sandbox, body(sandbox), 'End')
    expect(named).toEqual(['helix-before-panel-resize'])
    expect(sandbox.panelSize).toBe(36)
    expect(Math.round((part(sandbox, 'panel') as HTMLElement).getBoundingClientRect().height)).toBe(
      36,
    )
    // The sliver is this element's, held in `panel-size`, and not a second state
    // on the splitter that `panel-size` could not carry.
    expect(body(sandbox).hasAttribute('data-collapsed')).toBe(false)
  })

  test('an unrelated key is left alone', async () => {
    const sandbox = await mount(wired)
    const event = await press(sandbox as Updatable, panes(sandbox), 'PageDown')
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('sandbox source editing', () => {
  test('Tab indents rather than leaving the field', async () => {
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable & { value: string }
    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = 'x'
    field.selectionStart = 0
    field.selectionEnd = 0

    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    field.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(field.value).toBe('  x')
  })

  test('Escape then Tab moves focus out, which is the way back to the page', async () => {
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable
    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = 'x'

    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    const tab = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    field.dispatchEvent(tab)

    expect(tab.defaultPrevented).toBe(false)
    expect(field.value).toBe('x')
  })

  describe('sandbox panes', () => {
    test('a pane the preview does not know about drives nothing', async () => {
      // Not "`css` is the stylesheet and anything else is markup", which held
      // only while there were two panes: a third one showing the example as JSX
      // announces itself the same way, and the preview would render the text of
      // a React component as though it were markup.
      const sandbox = (await mount(`
      <helix-sandbox>
        <helix-sandbox-source slot="source" name="html" value="<p>one</p>"></helix-sandbox-source>
        <helix-sandbox-source slot="source" name="tsx" value="export function Example() {}"></helix-sandbox-source>
        <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
      </helix-sandbox>`)) as Updatable
      const preview = sandbox.querySelector('helix-sandbox-preview') as HTMLElement & {
        source: string
        styles: string
      }
      await sandbox.updateComplete

      const jsx = sandbox.querySelectorAll('helix-sandbox-source')[1] as HTMLElement & {
        value: string
      }
      jsx.dispatchEvent(
        new CustomEvent('helix-before-edit', {
          bubbles: true,
          composed: true,
          detail: { value: 'export function Example() {}' },
        }),
      )
      await sandbox.updateComplete
      expect(preview.source).not.toContain('export function')
    })
  })

  describe('sandbox dividers', () => {
    test('the corner carries the name this element gave it', async () => {
      // The splitter draws it, so the label has to reach it from here: it is the
      // one part of the corner that knows what the two panes are.
      const sandbox = (await mount(withPanel)) as Updatable
      const outer = part(sandbox, 'body') as Updatable
      await outer.updateComplete
      await sandbox.updateComplete
      const corner = outer.shadowRoot?.querySelector('[part="corner"]')
      expect(corner?.getAttribute('role')).toBe('separator')
      expect(corner?.getAttribute('aria-label')).toBe('Resize panes and panel')
    })

    /* The panel's own geometry is not asserted here, and cannot be. It is given
       in pixels and handed to the splitter as a share of the body, so it needs a
       measured height, and happy-dom lays nothing out: every box is zero, the
       share is zero, and the conversion refuses rather than dividing by it. A
       browser covers it. */
  })
})

describe('lead', () => {
  const panes = (sandbox: Awaited<ReturnType<typeof mount>>): (string | null)[] =>
    [...(sandbox.shadowRoot?.querySelectorAll('[part="pane"]') ?? [])].map((pane) =>
      pane.getAttribute('data-pane'),
    )

  test('the source leads by default, which is what a workbench wants', async () => {
    const sandbox = await mount('<helix-sandbox></helix-sandbox>')
    expect(panes(sandbox)).toEqual(['source', 'preview'])
  })

  test('the preview leads when asked, which is what a reference page wants', async () => {
    const sandbox = await mount('<helix-sandbox lead="preview"></helix-sandbox>')
    expect(panes(sandbox)).toEqual(['preview', 'source'])
  })

  /* The slot has to travel with the pane. Leaving `name="source"` in the first
     position and only relabelling the box would put the consumer's preview in
     the pane marked source, which is the bug this property exists to avoid. */
  /* The divider's value is the lead pane's share, so its name says which pane
     that is. */
  test('the divider is named for the pane it sizes', async () => {
    const name = async (markup: string): Promise<string | null | undefined> =>
      (await mount(markup)).shadowRoot?.querySelector('[part="panes"]')?.getAttribute('label')
    expect(await name('<helix-sandbox></helix-sandbox>')).toBe('Resize source pane')
    expect(await name('<helix-sandbox lead="preview"></helix-sandbox>')).toBe('Resize preview pane')
    expect(await name('<helix-sandbox separator-label="Split"></helix-sandbox>')).toBe('Split')
  })

  test('the slot moves with the pane, so content is never orphaned', async () => {
    const sandbox = await mount(
      '<helix-sandbox lead="preview"><p slot="preview">shown</p></helix-sandbox>',
    )
    const slot = sandbox.shadowRoot?.querySelector('[data-pane="preview"] slot') as HTMLSlotElement
    expect(slot.name).toBe('preview')
    expect(slot.assignedElements().map((node) => node.textContent)).toEqual(['shown'])
  })
})

/* A page styles the sandbox around what it is doing, which the light DOM
   cannot say: whether the panel is shut. A custom state, so nothing is written
   where a framework reconciles. */
describe('sandbox states', () => {
  test('`panel-collapsed` follows the panel and its height', async () => {
    const bare = (await mount(wired)) as Updatable & { panelSize: number }
    bare.panelSize = 0
    await bare.updateComplete
    expect(hasState(bare, 'panel-collapsed')).toBe(false)

    const full = (await mount(withPanel)) as Updatable & { panelSize: number }
    await full.updateComplete
    expect(hasState(full, 'panel-collapsed')).toBe(false)
    full.panelSize = 0
    await full.updateComplete
    expect(hasState(full, 'panel-collapsed')).toBe(true)

    const tabs = (await mount(
      withPanel.replace(
        '<helix-sandbox>',
        '<helix-sandbox panel-collapsed-size="40" panel-size="40">',
      ),
    )) as Updatable & { panelSize: number }
    await tabs.updateComplete
    expect(hasState(tabs, 'panel-collapsed')).toBe(true)
    tabs.panelSize = 41
    await tabs.updateComplete
    expect(hasState(tabs, 'panel-collapsed')).toBe(false)
  })
})
