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
    const sandbox = await mount(wired)
    const separator = part(sandbox, 'separator')
    expect(separator?.getAttribute('role')).toBe('separator')
    expect(separator?.getAttribute('aria-valuenow')).toBe('45')
    // Focusable, because a divider only a mouse can move is unusable without one.
    expect(separator?.getAttribute('tabindex')).toBe('0')
  })

  test('arrow keys move the split', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    press(sandbox, 'ArrowRight')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(47)

    press(sandbox, 'ArrowLeft')
    press(sandbox, 'ArrowLeft')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(43)
  })

  test('the split cannot be driven to nothing', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    press(sandbox, 'Home')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(15)

    press(sandbox, 'End')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(85)
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
})
