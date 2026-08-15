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

describe('sandbox divider', () => {
  const press = (host: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    part(host, 'separator')?.dispatchEvent(event)
    return event
  }

  test('is a separator that reports where it is', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const separator = part(sandbox, 'separator')
    expect(separator?.getAttribute('role')).toBe('separator')
    // Whatever the split is, not whatever number it happens to start at: the
    // assertion that matters is that the two agree, and pinning the literal
    // meant a change of default read as a broken separator.
    expect(separator?.getAttribute('aria-valuenow')).toBe(String(sandbox.split))
    // Focusable, because a divider only a mouse can move is unusable without one.
    expect(separator?.getAttribute('tabindex')).toBe('0')
  })

  test('arrow keys move the split', async () => {
    // By a step from wherever it was, which is the behaviour. The step is the
    // component's and the starting point is a default, and a spec that names
    // both fails when either moves for reasons that are not this one.
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const start = sandbox.split
    press(sandbox, 'ArrowRight')
    await sandbox.updateComplete
    const step = sandbox.split - start
    expect(step).toBeGreaterThan(0)

    press(sandbox, 'ArrowLeft')
    press(sandbox, 'ArrowLeft')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(start - step)
  })

  test('the split reaches both ends and stops there', async () => {
    /* It used to stop short, at fifteen and eighty-five, with a snap to nothing
       once a drag went half as far again. Two rules over one gesture, and the
       seam between them was a jump: the pane held at a floor and then vanished
       in a frame. It goes where it is put now, and the ends are ends rather
       than places to be thrown from. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    press(sandbox, 'Home')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(0)

    press(sandbox, 'End')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(100)

    // And no further, in either direction.
    press(sandbox, 'ArrowRight')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(100)
  })

  test('a size that is not a number does not take the grid with it', async () => {
    /* These go into custom properties and are substituted into
       `grid-template-columns`. A custom property holds nearly anything at parse
       time and fails only where it is used, and an invalid template falls back
       to `none`, so the grid stops being three columns and auto-places instead:
       one bad number cost the whole layout rather than one track. A consumer
       setting `split` to `undefined` to mean "the default" is what found it. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    const sizes = () => sandbox.shadowRoot?.querySelector('#sizes')?.textContent ?? ''

    sandbox.split = undefined as unknown as number
    await sandbox.updateComplete
    expect(sizes()).not.toContain('undefined')
    expect(sizes()).toContain('--_sandbox-split: 50%')

    sandbox.split = Number.NaN
    await sandbox.updateComplete
    expect(sizes()).not.toContain('NaN')
    expect(sizes()).toContain('--_sandbox-split: 50%')

    // And a real one still gets through.
    sandbox.split = 30
    await sandbox.updateComplete
    expect(sizes()).toContain('--_sandbox-split: 30%')
  })

  test('a pane at nothing says so, for the divider beside it', async () => {
    /* A boundary needs two sides. With a pane at zero its divider is a rule at
       the edge of the sandbox with empty space behind it, which reads as the
       border of a pane that is no longer there, so the styling turns it off and
       needs to know. The line itself cannot be asserted here: happy-dom has no
       layout and no cascade to speak of, so this covers the flag and a browser
       covers the paint. */
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    expect(sandbox.dataset.collapsed).toBeUndefined()

    sandbox.split = 0
    await sandbox.updateComplete
    expect(sandbox.dataset.collapsed).toBe('inline')

    sandbox.split = 40
    await sandbox.updateComplete
    expect(sandbox.dataset.collapsed).toBeUndefined()
  })

  test('an unrelated key is left alone', async () => {
    const sandbox = await mount(wired)
    expect(press(sandbox, 'PageDown').defaultPrevented).toBe(false)
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
    test('the panel dividers appear only when there is a panel to size', async () => {
      // There is no asking in CSS, `:host(:has([slot="panel"]))` being invalid,
      // and nothing to ask on the server. `slotchange` is what answers.
      const bare = (await mount(wired)) as Updatable
      expect(bare.shadowRoot?.querySelector('[part="corner"]')).toBeNull()

      const full = (await mount(withPanel)) as Updatable
      await full.updateComplete
      expect(full.shadowRoot?.querySelector('[part="separator"][data-axis="block"]')).not.toBeNull()
      expect(full.shadowRoot?.querySelector('[part="corner"]')).not.toBeNull()
    })

    test('each divider answers only the arrows it can move', async () => {
      const sandbox = (await mount(withPanel)) as Updatable & { panelSize: number; split: number }
      await sandbox.updateComplete
      const start = sandbox.split
      const press = async (selector: string, key: string) => {
        sandbox.shadowRoot
          ?.querySelector(selector)
          ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
        await sandbox.updateComplete
      }

      await press('[part="separator"][data-drag="inline"]', 'ArrowLeft')
      const moved = sandbox.split
      expect(moved).toBeLessThan(start)
      await press('[part="separator"][data-drag="inline"]', 'ArrowUp')
      expect(sandbox.panelSize).toBe(192)

      await press('[part="separator"][data-axis="block"]', 'ArrowUp')
      expect(sandbox.panelSize).toBe(208)
      // Still where the inline divider left it: this one moves the other axis.
      await press('[part="separator"][data-axis="block"]', 'ArrowLeft')
      expect(sandbox.split).toBe(moved)
    })

    test('the corner answers both, each arrow along its own axis', async () => {
      const sandbox = (await mount(withPanel)) as Updatable & { panelSize: number; split: number }
      await sandbox.updateComplete
      const press = async (key: string) => {
        sandbox.shadowRoot
          ?.querySelector('[part="corner"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
        await sandbox.updateComplete
      }
      const start = sandbox.split
      await press('ArrowRight')
      expect(sandbox.split).toBeGreaterThan(start)
      await press('ArrowUp')
      expect(sandbox.panelSize).toBe(208)
    })

    test('the corner is a separator with a name, and claims no single orientation', async () => {
      // `aria-orientation` has no value meaning "both", and inventing one says
      // less than saying nothing: the label is what carries it.
      const sandbox = (await mount(withPanel)) as Updatable
      await sandbox.updateComplete
      const corner = sandbox.shadowRoot?.querySelector('[part="corner"]')
      expect(corner?.getAttribute('role')).toBe('separator')
      expect(corner?.getAttribute('aria-orientation')).toBeNull()
      expect(corner?.getAttribute('aria-label')).toBe('Resize panes and panel')
    })
  })
})
