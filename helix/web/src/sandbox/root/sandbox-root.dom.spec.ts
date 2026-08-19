import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

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

    // Set by hand, because the panes reach the preview by event and an initial
    // attribute dispatches nothing.
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
        Object.assign(
          new MessageEvent('message', {
            data: { level: 'warn', text: 'from the example', type: 'helix-preview-console' },
          }),
          { origin, source },
        ),
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

    window.dispatchEvent(
      Object.assign(new MessageEvent('message', { data: { type: 'helix-preview-ready' } }), {
        origin: 'null',
        source: frame.contentWindow,
      }),
    )

    preview.layout = 'centered'
    preview.direction = 'rtl'
    await preview.updateComplete

    const last = sent.at(-1)
    expect(last?.layout).toBe('centered')
    expect(last?.direction).toBe('rtl')
  })

  test('the frame is answered at a wildcard, because a sandbox has no origin to name', async () => {
    // This asserted the opposite until the frame was sandboxed, and naming the
    // origin was right while there was one. There is not: `postMessage` has no
    // target string for an opaque origin, so `'*'` is the only thing that
    // delivers. It costs nothing, because what is sent is the example's own
    // source going to the document about to render it. What guards the other
    // direction is the origin check on the way back in.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable
    const frame = preview.shadowRoot?.querySelector('iframe') as HTMLIFrameElement
    const origins: string[] = []
    Object.defineProperty(frame, 'contentWindow', {
      value: { postMessage: (_: unknown, origin: string) => origins.push(origin) },
    })

    window.dispatchEvent(
      Object.assign(new MessageEvent('message', { data: { type: 'helix-preview-ready' } }), {
        origin: 'null',
        source: frame.contentWindow,
      }),
    )

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

type Splitter = HTMLElement & { position: number; updateComplete: Promise<unknown> }

/** The two splitters the sandbox arranges: the panes inside the panel. */
const panes = (host: HTMLElement): Splitter => part(host, 'panes') as Splitter
const body = (host: HTMLElement): Splitter => part(host, 'body') as Splitter
const bar = (splitter: Splitter): HTMLElement =>
  splitter.shadowRoot?.querySelector('[part="separator"]') as HTMLElement

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
    // A consumer passing `undefined` to mean "the default" is what found this
    // when the number went into `grid-template-columns`: one bad value threw the
    // whole template away. The grid is gone and the guard is not.
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
    const sandbox = await mount(withPanel)
    await body(sandbox).updateComplete
    await sandbox.updateComplete
    expect(body(sandbox).shadowRoot?.querySelector('[part="corner"]')).not.toBeNull()
  })

  test('and not when the panes are stacked, where the two run parallel', async () => {
    const sandbox = await mount(
      withPanel.replace('<helix-sandbox>', '<helix-sandbox orientation="vertical">'),
    )
    await body(sandbox).updateComplete
    await sandbox.updateComplete
    expect(body(sandbox).shadowRoot?.querySelector('[part="corner"]')).toBeNull()
  })

  test('the arrangement is announced once, and the splitters inside are not', async () => {
    /* A consumer stores one arrangement. What the two elements inside said to
       each other on the way there is not their business.

       It names the property that settled rather than the word `arrangement`,
       which named nothing on this element and carried both numbers as JSON that
       every consumer of it then ignored in favour of reading the element. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const named: string[] = []
    sandbox.addEventListener('helix-change', (event) => {
      named.push((event as CustomEvent<{ property: string }>).detail.property)
    })
    await press(sandbox, panes(sandbox), 'ArrowRight')
    expect(named).toEqual(['split'])
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
      // The rule was that `css` is the stylesheet and anything else is markup,
      // which held while there were two panes. A third one showing the example as
      // JSX announced itself the same way, and the preview rendered the text of a
      // React component as though it were markup.
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
        new CustomEvent('helix-change', {
          bubbles: true,
          composed: true,
          detail: { name: 'tsx', value: 'export function Example() {}' },
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
  test('the slot moves with the pane, so content is never orphaned', async () => {
    const sandbox = await mount(
      '<helix-sandbox lead="preview"><p slot="preview">shown</p></helix-sandbox>',
    )
    const slot = sandbox.shadowRoot?.querySelector('[data-pane="preview"] slot') as HTMLSlotElement
    expect(slot.name).toBe('preview')
    expect(slot.assignedElements().map((node) => node.textContent)).toEqual(['shown'])
  })
})
