import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Serve = typeof import('./frame.js').servePreview
let servePreview: Serve
let defaultFrame: typeof import('./frame.js').defaultFrame

beforeAll(async () => {
  registerDom()
  ;({ defaultFrame, servePreview } = await import('./frame.js'))
})

/** What the frame posted to its parent, which in a page of its own is itself. */
let posted: { type: string; [key: string]: unknown }[] = []
let stop: (() => void) | undefined
let send: typeof window.postMessage

beforeAll(() => {
  send = window.postMessage
})

let Watcher: typeof ResizeObserver
beforeAll(() => {
  Watcher = globalThis.ResizeObserver
})

afterEach(() => {
  globalThis.ResizeObserver = Watcher
  stop?.()
  stop = undefined
  window.postMessage = send
  posted = []
  document.head.replaceChildren()
  document.body.replaceChildren()
})

const serve = (): HTMLElement => {
  window.postMessage = ((message: { type: string }) => {
    posted.push(message)
  }) as typeof window.postMessage
  const root = document.createElement('div')
  root.id = 'preview-root'
  document.body.append(root)
  stop = servePreview()
  return root
}

const render = (data: Record<string, unknown>, source: unknown = window): void => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'helix-preview-render', ...data },
      source: source as Window,
    }),
  )
}

describe('servePreview', () => {
  test('says it is listening, once, and adds the layout rules', () => {
    const root = serve()
    expect(posted.map((message) => message.type)).toEqual(['helix-preview-ready'])
    expect(root.dataset.layout).toBe('padded')
    expect(document.head.querySelector('style')?.textContent).toContain('data-layout="hug"')
  })

  test('writes a render into the root, without its stylesheet links', () => {
    const root = serve()
    render({
      direction: 'rtl',
      layout: 'centered',
      source: '<link href="a.css" rel="stylesheet"><p>Hi</p>',
      styles: 'p { color: red }',
    })
    expect(root.innerHTML).toBe('<p>Hi</p>')
    expect(root.dataset.layout).toBe('centered')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.getElementById('preview-styles')?.textContent).toBe('p { color: red }')
    document.documentElement.dir = ''
  })

  test('says it drew each render, so the preview shows the frame', () => {
    serve()
    render({ source: '<p>Hi</p>' })
    expect(posted.at(-1)).toEqual({ type: 'helix-preview-rendered' })
  })

  test('renders nothing a window other than its parent sent', () => {
    const root = serve()
    render({ source: '<p>Hi</p>' }, null)
    expect(root.innerHTML).toBe('')
  })

  test('keeps the tree when only the styles moved, and says which', () => {
    const renders: boolean[] = []
    window.postMessage = (() => {}) as typeof window.postMessage
    const root = document.createElement('div')
    document.body.append(root)
    stop = servePreview({ onRender: (_, fresh) => renders.push(fresh), root })
    render({ source: '<p>Hi</p>' })
    const first = root.firstElementChild
    render({ source: '<p>Hi</p>', styles: 'p { color: blue }' })
    expect(root.firstElementChild).toBe(first)
    expect(renders).toEqual([true, false])
  })

  /* A layout that fills the viewport holds the root at the frame's height, so
     the root never shrinks with what it holds, and a watcher on the root alone
     never posted a smaller size: a preview stayed at its tallest. */
  test('watches each child the root holds, so a child that shrinks is heard', async () => {
    const watched: Element[] = []
    globalThis.ResizeObserver = class {
      observe(target: Element): void {
        watched.push(target)
      }
      disconnect(): void {
        watched.length = 0
      }
      unobserve(): void {}
    } as unknown as typeof ResizeObserver
    const root = serve()
    expect(watched.length).toBe(1)
    expect(watched[0]).toBe(root)
    render({
      layout: 'centered',
      source: '<div id="tall">a</div><p style="display: contents"><b>b</b></p>',
    })
    await Promise.resolve()
    expect(watched.length).toBe(3)
    expect(watched[0]).toBe(root)
    expect(watched[1]).toBe(root.querySelector('#tall') as Element)
    expect(watched[2]).toBe(root.querySelector('b') as Element)
  })

  test('posts what the example logs, and puts the console back when it stops', () => {
    const original = console.info
    console.info = (() => {}) as typeof console.info
    try {
      serve()
      console.info('Saved', { id: 2 })
      expect(posted.at(-1)).toEqual({
        level: 'info',
        text: 'Saved {"id":2}',
        type: 'helix-preview-console',
      })
      stop?.()
      stop = undefined
      expect(console.info).not.toBe(original)
    } finally {
      console.info = original
    }
  })

  test('marks an error the example did not catch, so the preview can say it failed', () => {
    serve()
    window.dispatchEvent(new ErrorEvent('error', { message: 'Boom' }))
    expect(posted.at(-1)).toEqual({
      level: 'error',
      text: 'Boom',
      type: 'helix-preview-console',
      uncaught: true,
    })
  })

  /* An example that awaits something and fails rejects a promise, and the
     page hears no `error` event for that: the preview stayed unfailed. */
  test('marks a promise rejected with nobody to catch it, as the console says it', () => {
    serve()
    const refuse = (reason: unknown): void => {
      window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }))
    }
    refuse(new TypeError('Failed to fetch'))
    expect(posted.at(-1)).toEqual({
      level: 'error',
      text: 'Uncaught (in promise) TypeError: Failed to fetch',
      type: 'helix-preview-console',
      uncaught: true,
    })
    refuse({ code: 4 })
    expect(posted.at(-1)?.text).toBe('Uncaught (in promise) {"code":4}')
  })
})

/* The document a preview loads without `src`, whose script is the protocol's
   own source. Run here as the frame runs it, so a helper it names and was not
   given fails this instead of a reader's sandbox. */
describe('the built-in frame document', () => {
  const script = (): string => {
    const page = defaultFrame()
    const open = page.indexOf('<script>') + '<script>'.length
    return page.slice(open, page.indexOf('</script>', open))
  }

  test('closes its script once, at its end', () => {
    const page = defaultFrame()
    expect(page.match(/<\/script>/g)?.length).toBe(1)
    expect(page.endsWith('</script></body></html>')).toBe(true)
    expect(page).toContain('<div id="preview-root"></div>')
  })

  test('serves the protocol from its script alone', () => {
    window.postMessage = ((message: { type: string }) => {
      posted.push(message)
    }) as typeof window.postMessage
    const root = document.createElement('div')
    root.id = 'preview-root'
    document.body.append(root)
    stop = new Function(`return ${script()}`)() as () => void
    expect(posted.map((message) => message.type)).toEqual(['helix-preview-ready'])
    render({ layout: 'hug', source: '<p>Hi</p>', styles: 'p { color: red }' })
    expect(root.innerHTML).toBe('<p>Hi</p>')
    expect(root.dataset.layout).toBe('hug')
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'no' }))
    expect(posted.at(-1)).toEqual({
      level: 'error',
      text: 'Uncaught (in promise) no',
      type: 'helix-preview-console',
      uncaught: true,
    })
  })
})
