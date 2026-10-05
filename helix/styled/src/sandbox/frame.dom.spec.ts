import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Serve = typeof import('./frame.js').servePreview
let servePreview: Serve

beforeAll(async () => {
  registerDom()
  ;({ servePreview } = await import('./frame.js'))
})

/** What the frame posted to its parent, which in a page of its own is itself. */
let posted: { type: string; [key: string]: unknown }[] = []
let stop: (() => void) | undefined
let send: typeof window.postMessage

beforeAll(() => {
  send = window.postMessage
})

afterEach(() => {
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
})
