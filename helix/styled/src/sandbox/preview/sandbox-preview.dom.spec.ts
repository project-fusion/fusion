import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Preview = HTMLElement & { updateComplete: Promise<boolean> }

/** Puts back a method a case replaced. */
let restore: (() => void) | undefined

afterEach(() => {
  restore?.()
  restore = undefined
})

const preview = async (attributes = 'src="/frame.html"'): Promise<Preview> =>
  (await mount(`<helix-sandbox-preview ${attributes}></helix-sandbox-preview>`)) as Preview

/**
 * The preview pane, and the contract that is the pane's rather than the
 * sandbox's.
 *
 * **The sandbox already proves the arrangement**: which pane leads, what the
 * splitter does and how the source reaches the preview. What this pane owns
 * alone is that it *is* the security boundary, and the sandbox cannot assert
 * that, because a frame with `allow-same-origin` on it renders every example
 * correctly and passes every layout assertion ever written. It fails only
 * against an example that attacks the page, which nothing here runs on purpose.
 */
describe('the preview pane', () => {
  /* `allow-scripts` with `allow-same-origin` beside it is the same as no sandbox
     at all: a document on its own origin can reach up and remove the attribute.
     Measured before this was closed, an `onerror` on a failing image read the
     site's `localStorage`, its cookies and the editor's contents. */
  test('never grants the frame its own origin, whatever else it grants', async () => {
    const frame = part(await preview(), 'frame') as HTMLIFrameElement
    const granted = (frame.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean)

    expect(granted).not.toContain('allow-same-origin')
    expect(frame.hasAttribute('sandbox')).toBe(true)
  })

  /* Scripts and forms, because examples have both. Top-level navigation, popups
     and modals are not granted, and a list rather than a substring check is what
     makes this fail on a fourth token somebody adds without thinking. */
  test('grants scripts and forms, and nothing beyond them', async () => {
    const frame = part(await preview(), 'frame') as HTMLIFrameElement
    const granted = (frame.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean).sort()

    expect(granted).toEqual(['allow-forms', 'allow-scripts'])
  })

  /* A frame with no accessible name is a region a reader reaches and cannot
     identify, and the name is the pane's rather than the sandbox's because the
     sandbox does not render the frame. */
  test('names the frame, so a reader who reaches it knows what it is', async () => {
    expect((part(await preview(), 'frame') as HTMLIFrameElement).getAttribute('title')).toBe(
      'Preview',
    )

    const named = await preview('src="/frame.html" label="Card, live"')
    expect((part(named, 'frame') as HTMLIFrameElement).getAttribute('title')).toBe('Card, live')
  })
})

/* A page shows its own spinner or message beside the frame, and needs to know
   when: the frame is another document, so nothing in the page can see it load
   or fail. */
describe('the preview states', () => {
  const from = (frame: HTMLIFrameElement, data: unknown): MessageEvent =>
    new MessageEvent('message', { data, origin: 'null', source: frame.contentWindow })

  test('is `loading` from a `src` until the frame loads, and again on `reload`', async () => {
    expect(hasState(await preview(''), 'loading')).toBe(false)
    const host = (await preview()) as Preview & { reload: () => void }
    expect(hasState(host, 'loading')).toBe(true)
    const frame = part(host, 'frame') as HTMLIFrameElement
    frame.dispatchEvent(new Event('load'))
    expect(hasState(host, 'loading')).toBe(false)
    host.reload()
    expect(hasState(host, 'loading')).toBe(true)
    window.dispatchEvent(from(frame, { type: 'helix-preview-ready' }))
    expect(hasState(host, 'loading')).toBe(false)
  })

  test('is `failed` after an uncaught error, until the next source is sent', async () => {
    const host = (await preview()) as Preview & { source: string }
    const frame = part(host, 'frame') as HTMLIFrameElement
    frame.dispatchEvent(new Event('load'))
    const line = { level: 'error', text: 'Boom', type: 'helix-preview-console' }
    window.dispatchEvent(from(frame, line))
    expect(hasState(host, 'failed')).toBe(false)
    window.dispatchEvent(from(frame, { ...line, uncaught: true }))
    expect(hasState(host, 'failed')).toBe(true)
    host.source = '<p>Fixed</p>'
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(hasState(host, 'failed')).toBe(false)
  })

  /* The frame runs what it is sent and reports what it throws, and skips a
     source it already holds. A source sent ahead of the wait was run at once,
     and the send at the end of the wait cleared the `failed` it caused. */
  test('stays `failed` for every throwing source, not only the first, and sends once a burst', async () => {
    const host = (await preview()) as Preview & { source: string }
    const frame = part(host, 'frame') as HTMLIFrameElement
    /* A window of the page's own stands in for the frame's. The frame is on an
       opaque origin, so in a browser its `postMessage` cannot be replaced. */
    const stand = document.createElement('iframe')
    document.body.append(stand)
    const target = stand.contentWindow as Window
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: target })
    const sent: string[] = []
    let held = ''
    target.postMessage = ((message: { source: string }) => {
      sent.push(message.source)
      if (message.source === held) {
        return
      }
      held = message.source
      if (message.source.includes('throw')) {
        queueMicrotask(() =>
          window.dispatchEvent(
            from(frame, {
              level: 'error',
              text: 'Uncaught Error',
              type: 'helix-preview-console',
              uncaught: true,
            }),
          ),
        )
      }
    }) as Window['postMessage']
    restore = () => {
      delete (frame as { contentWindow?: Window | null }).contentWindow
      stand.remove()
    }
    const settle = async (): Promise<void> => {
      await host.updateComplete
      await new Promise((resolve) => setTimeout(resolve, 200))
      await host.updateComplete
    }
    frame.dispatchEvent(new Event('load'))
    /* Past any load of the frame's own, which sends the source again. */
    await settle()
    for (const source of ['<script>throw 1</script>', '<p>Fixed</p>', '<script>throw 2</script>']) {
      sent.length = 0
      host.source = source
      await settle()
      expect(sent).toEqual([source])
    }
    expect(hasState(host, 'failed')).toBe(true)
    host.source = '<script>throw 3</script>'
    await settle()
    expect(hasState(host, 'failed')).toBe(true)
  })
})
