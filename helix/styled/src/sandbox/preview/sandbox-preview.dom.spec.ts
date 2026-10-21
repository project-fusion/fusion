import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import { compilers } from '../compile.js'

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

/** A recognizer that settles on one phrase the moment it starts. */
class FakeRecognition {
  continuous = false

  interimResults = false

  lang = ''

  onend: (() => void) | null = null

  onerror: ((event: { error: string }) => void) | null = null

  onresult:
    | ((event: {
        resultIndex: number
        results: ArrayLike<{ 0?: { transcript: string }; isFinal: boolean }>
      }) => void)
    | null = null

  start(): void {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: 'hello' }, isFinal: true }],
    })
    this.onend?.()
  }

  stop(): void {
    this.onend?.()
  }
}

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

  /* Dictation asks for the microphone from inside the frame. The frame's
     origin is opaque, so the grant has to be named here. */
  test('grants the microphone, so dictation in an example can ask for it', async () => {
    const frame = part(await preview(), 'frame') as HTMLIFrameElement
    const granted = (frame.getAttribute('allow') ?? '')
      .split(';')
      .map((token) => token.trim())
      .filter(Boolean)
      .sort()

    expect(granted).toEqual(['clipboard-write *', 'fullscreen *', 'microphone *'])
  })

  /* The frame's origin is opaque, so the recognizer there never starts. The
     page listens and sends the phrase back. */
  test('listens on this page when the frame asks, and sends the phrase back', async () => {
    const host = await preview()
    const frame = part(host, 'frame') as HTMLIFrameElement
    const stand = document.createElement('iframe')
    document.body.append(stand)
    const target = stand.contentWindow as Window
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: target })
    const heard: { kind?: string; text?: string }[] = []
    target.postMessage = ((message: { kind?: string; text?: string; type?: string }) => {
      if (message.type === 'helix-speech-heard') {
        heard.push(message)
      }
    }) as Window['postMessage']
    const scope = window as unknown as {
      SpeechRecognition: (new () => FakeRecognition) | undefined
    }
    const original = scope.SpeechRecognition
    scope.SpeechRecognition = FakeRecognition
    restore = () => {
      scope.SpeechRecognition = original
      delete (frame as { contentWindow?: Window | null }).contentWindow
      stand.remove()
    }
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { id: 7, lang: 'en-US', type: 'helix-speech-start' },
        origin: 'null',
        source: target,
      }),
    )
    /* The recognizer starts once the page has asked whether the device can listen. */
    await new Promise((settle) => setTimeout(settle, 0))
    expect(heard.map((one) => [one.kind, one.text])).toEqual([
      ['final', 'hello'],
      ['end', undefined],
    ])
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
/* A sandbox with no frame document of its own rendered an empty box, and the
   only way to see an example was to build and host one. */
describe('the built-in frame document', () => {
  test('loads where there is no `src`, and steps aside for one', async () => {
    const own = part(await preview(''), 'frame') as HTMLIFrameElement
    expect(own.hasAttribute('src')).toBe(false)
    expect(own.getAttribute('srcdoc')).toContain('<div id="preview-root"></div>')
    const hosted = part(await preview(), 'frame') as HTMLIFrameElement
    expect(hosted.getAttribute('src')).toBe('/frame.html')
    expect(hosted.hasAttribute('srcdoc')).toBe(false)
  })

  /* An example that imported a package by name failed in the built-in
     document: nothing told the browser where the name lives. */
  test('resolves the packages `imports` names, through an import map ahead of every script', async () => {
    const own = (await preview(
      `src="" imports='{"canvas-confetti": "https://esm.sh/canvas-confetti@1.9.3"}'`,
    )) as Preview & { imports: Record<string, string> }
    const document = part(own, 'frame')?.getAttribute('srcdoc') ?? ''
    const map = document.match(/<script type="importmap">(.*?)<\/script>/)?.[1] ?? ''
    expect(JSON.parse(map)).toEqual({
      imports: { 'canvas-confetti': 'https://esm.sh/canvas-confetti@1.9.3' },
    })
    expect(document.indexOf('type="importmap"')).toBeLessThan(document.indexOf('<script>'))
    /* A map is read once, as the document loads, so a new one loads it again. */
    own.imports = { lodash: 'https://esm.sh/lodash-es@4.17.21' }
    await own.updateComplete
    expect(part(own, 'frame')?.getAttribute('srcdoc')).toContain('lodash-es@4.17.21')
    expect(hasState(own, 'loading')).toBe(true)
    /* No map without `imports`, so the document is what it was. */
    const plain = part(await preview(''), 'frame')?.getAttribute('srcdoc') ?? ''
    expect(plain).not.toContain('importmap')
  })

  /* An example needed the address of every package it imported, where a
     `package.json` names a package by its version. */
  test('loads `dependencies` by version from `cdn`, and `imports` wins over one of the same name', async () => {
    const own = (await preview(
      `src="" dependencies='{"canvas-confetti": "^1.9", "lodash-es": "4"}' imports='{"lodash-es": "/lodash.js"}'`,
    )) as Preview & { cdn: string }
    const mapOf = (): Record<string, string> => {
      const document = part(own, 'frame')?.getAttribute('srcdoc') ?? ''
      return JSON.parse(document.match(/<script type="importmap">(.*?)<\/script>/)?.[1] ?? '{}')
        .imports
    }
    expect(mapOf()).toEqual({
      'canvas-confetti': 'https://esm.sh/canvas-confetti@^1.9',
      'canvas-confetti/': 'https://esm.sh/canvas-confetti@^1.9/',
      'lodash-es': '/lodash.js',
      'lodash-es/': 'https://esm.sh/lodash-es@4/',
    })
    own.cdn = 'https://cdn.jsdelivr.net/npm/'
    await own.updateComplete
    expect(mapOf()['canvas-confetti']).toBe('https://cdn.jsdelivr.net/npm/canvas-confetti@^1.9')
    expect(hasState(own, 'loading')).toBe(true)
  })

  test('maps each of `modules` to its source, for the scripts and for each other', async () => {
    const own = (await preview('src=""')) as Preview & { modules: Record<string, string> }
    own.modules = {
      'lib/math.js': 'export const two = 2',
      'utils.js': "export * from './lib/math.js'",
    }
    await own.updateComplete
    const document = part(own, 'frame')?.getAttribute('srcdoc') ?? ''
    const map = JSON.parse(document.match(/<script type="importmap">(.*?)<\/script>/)?.[1] ?? '{}')
      .imports as Record<string, string>
    const text = (address = ''): string => decodeURIComponent(address.replace(/^data:[^,]*,/, ''))
    expect(Object.keys(map).sort()).toEqual([
      './lib/math.js',
      './utils.js',
      'sandbox:/lib/math.js',
      'sandbox:/utils.js',
    ])
    expect(text(map['./lib/math.js'])).toBe('export const two = 2')
    /* A `data:` module has no folder, so its relative import names its neighbor's own key. */
    expect(text(map['./utils.js'])).toBe("export * from 'sandbox:/lib/math.js'")
    /* The same module either way, so it runs once. */
    expect(map['sandbox:/utils.js']).toBe(map['./utils.js'])
  })

  describe('a module in TypeScript or JSX', () => {
    type Modular = Preview & { modules: Record<string, string> }
    const mapOf = (own: HTMLElement): Record<string, string> =>
      JSON.parse(
        (part(own, 'frame')?.getAttribute('srcdoc') ?? '').match(
          /<script type="importmap">(.*?)<\/script>/,
        )?.[1] ?? '{"imports":{}}',
      ).imports
    const text = (address = ''): string =>
      decodeURIComponent(address.replace(/^data:[^,]*,/, '')).split('\n//# sourceMappingURL')[0] ??
      ''

    /** A compiler that answers when told to, standing where the preview loads Sucrase from. */
    const held = (cdn: string): (() => void) => {
      let answer: () => void = () => {}
      const answered = new Promise<void>((resolve) => {
        answer = resolve
      })
      compilers.set(cdn, async (source: string) => {
        await answered
        return { code: source.replace(/: number/g, '') }
      })
      return answer
    }

    const compiled = async (own: Preview): Promise<void> => {
      for (let turn = 0; turn < 5; turn += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        await own.updateComplete
      }
    }

    afterEach(() => {
      compilers.clear()
    })

    test('is compiled before the frame loads it, and imported by its path or without its extension', async () => {
      const answer = held('test-a:/')
      const own = (await preview('src="" cdn="test-a:/"')) as Modular
      own.modules = {
        'app.tsx': 'export const two: number = 2',
        'utils.js': "export * from './app'",
      }
      await own.updateComplete
      /* Held at the map it had, so the frame does not load without the module. */
      expect(mapOf(own)['./utils.js']).toBeUndefined()
      answer()
      await compiled(own)
      const map = mapOf(own)
      expect(text(map['./app.tsx'])).toBe('export const two = 2')
      expect(map['./app']).toBe(map['./app.tsx'] as string)
      expect(map['sandbox:/app']).toBe(map['./app.tsx'] as string)
      expect(text(map['./utils.js'])).toBe("export * from 'sandbox:/app'")
    })

    test('loads no compiler where every module is JavaScript', async () => {
      const own = (await preview('src="" cdn="test-b:/"')) as Modular
      own.modules = { 'utils.js': 'export const one = 1' }
      await own.updateComplete
      expect(compilers.has('test-b:/')).toBe(false)
    })
  })

  test('keeps the sandbox, with scripts and no origin of its own', async () => {
    const own = part(await preview(''), 'frame') as HTMLIFrameElement
    expect((own.getAttribute('sandbox') ?? '').split(/\s+/).sort()).toEqual([
      'allow-forms',
      'allow-scripts',
    ])
  })
})

describe('the preview states', () => {
  const from = (frame: HTMLIFrameElement, data: unknown): MessageEvent =>
    new MessageEvent('message', { data, origin: 'null', source: frame.contentWindow })

  test('is `loading` from a `src` until the frame loads, and again on `reload`', async () => {
    // The built-in document loads too.
    expect(hasState(await preview(''), 'loading')).toBe(true)
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

  test('is `blank` until the frame says it drew, and again on `reload`', async () => {
    const host = (await preview()) as Preview & { reload: () => void }
    const frame = part(host, 'frame') as HTMLIFrameElement
    expect(hasState(host, 'blank')).toBe(true)
    frame.dispatchEvent(new Event('load'))
    // Listening is not drawing: the frame has not painted in the page's mode yet.
    expect(hasState(host, 'blank')).toBe(true)
    window.dispatchEvent(from(frame, { type: 'helix-preview-rendered' }))
    expect(hasState(host, 'blank')).toBe(false)
    host.reload()
    expect(hasState(host, 'blank')).toBe(true)
    window.dispatchEvent(from(frame, { size: 120, type: 'helix-preview-size' }))
    expect(hasState(host, 'blank')).toBe(false)
  })

  /* **A second from the last send, which is not always the `load` below.** The
     source settles 120ms after mounting and sends again, and in a browser the
     frame's own document loads and sends again whenever it arrives. Each send
     restarts the wait, so a fixed 1,050ms check failed on a busy CI runner. The
     frame is still blank at 900ms whatever sends came after, and it is shown
     once the last wait ends. */
  test('shows a frame that never says it drew, a second after it is sent an example', async () => {
    const host = await preview()
    const frame = part(host, 'frame') as HTMLIFrameElement
    frame.dispatchEvent(new Event('load'))
    expect(hasState(host, 'blank')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(hasState(host, 'blank')).toBe(true)
    const end = performance.now() + 3000
    while (hasState(host, 'blank') && performance.now() < end) {
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    expect(hasState(host, 'blank')).toBe(false)
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

  /* A frame that loads inside the wait, as the built-in document does, runs
     the example at once, and the wait ending sends the same source again,
     which the frame skips. Clearing `failed` there hid the failure. */
  test('stays `failed` when the frame failed on the source the wait then sends', async () => {
    const host = (await preview()) as Preview & { source: string }
    const frame = part(host, 'frame') as HTMLIFrameElement
    host.source = '<script>throw 1</script>'
    await host.updateComplete
    frame.dispatchEvent(new Event('load'))
    window.dispatchEvent(
      from(frame, { level: 'error', text: 'Boom', type: 'helix-preview-console', uncaught: true }),
    )
    expect(hasState(host, 'failed')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(hasState(host, 'failed')).toBe(true)
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

describe('the error, and the controls', () => {
  const from = (frame: HTMLIFrameElement, data: unknown): MessageEvent =>
    new MessageEvent('message', { data, origin: 'null', source: frame.contentWindow })

  /* A failure was a state and nothing else, so a sandbox nobody styled for it
     went on showing the last example that worked. */
  test('shows what the example threw over it while it is `failed`, and not after', async () => {
    const host = (await preview()) as Preview & { source: string }
    const frame = part(host, 'frame') as HTMLIFrameElement
    frame.dispatchEvent(new Event('load'))
    expect(part(host, 'error')).toBeNull()
    window.dispatchEvent(
      from(frame, {
        level: 'error',
        text: 'Uncaught TypeError: x is not a function',
        type: 'helix-preview-console',
        uncaught: true,
      }),
    )
    await host.updateComplete
    expect(part(host, 'error')?.textContent).toBe('Uncaught TypeError: x is not a function')
    /* The frame is described by the error while it shows. */
    expect(frame.getAttribute('aria-describedby')).toBe(part(host, 'error')?.id ?? null)
    host.source = '<p>Fixed</p>'
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 150))
    await host.updateComplete
    expect(part(host, 'error')).toBeNull()
    expect(frame.hasAttribute('aria-describedby')).toBe(false)
  })

  test('draws no buttons without `controls`, and a named reload and open with it', async () => {
    expect(part(await preview(), 'controls')).toBeNull()
    const host = (await preview('src="/frame.html" controls')) as Preview & { reload: () => void }
    const reload = part(host, 'reload') as HTMLButtonElement
    const open = part(host, 'open') as HTMLButtonElement
    expect([reload.textContent, open.textContent]).toEqual([
      'Reload preview',
      'Open preview in a new tab',
    ])
    expect([reload.type, open.type]).toEqual(['button', 'button'])
    ;(part(host, 'frame') as HTMLIFrameElement).dispatchEvent(new Event('load'))
    expect(hasState(host, 'loading')).toBe(false)
    reload.click()
    expect(hasState(host, 'loading')).toBe(true)
  })

  /* The tab is a page of this origin, so the example must not run in it: it
     runs in a frame inside, with the same sandbox and the same feature grants
     as the preview's own. */
  test('opens the example in a new tab, in a frame sandboxed as its own, cut off from the page', async () => {
    const host = (await preview('src="/frame.html" controls label="Card"')) as Preview & {
      open: () => Window | null
      source: string
    }
    host.source = '<p>Hello</p>'
    await host.updateComplete
    const tabDocument = document.implementation.createHTMLDocument('')
    const tab = Object.assign(new EventTarget(), {
      document: tabDocument,
      opener: window,
    }) as unknown as Window
    const original = window.open
    const asked: unknown[][] = []
    window.open = ((...args: unknown[]) => {
      asked.push(args)
      return tab
    }) as typeof window.open
    restore = () => {
      window.open = original
    }
    ;(part(host, 'open') as HTMLButtonElement).click()
    expect(asked).toEqual([['', '_blank']])
    expect(tab.opener).toBeNull()
    expect(tabDocument.title).toBe('Card')
    const frame = tabDocument.querySelector('iframe') as HTMLIFrameElement
    expect((frame.getAttribute('sandbox') ?? '').split(/\s+/).sort()).toEqual([
      'allow-forms',
      'allow-scripts',
    ])
    expect(frame.getAttribute('allow')).toBe(
      (part(host, 'frame') as HTMLIFrameElement).getAttribute('allow'),
    )
    expect(frame.title).toBe('Card')
    expect(frame.getAttribute('src')).toBe((part(host, 'frame') as HTMLIFrameElement).src)
    // The tab's own script sends the example, since the frame takes one only from its parent.
    const sends = frame.nextElementSibling as HTMLScriptElement
    expect(sends.localName).toBe('script')
    expect(sends.textContent).toContain('"source":"<p>Hello</p>"')

    window.open = (() => null) as typeof window.open
    expect(host.open()).toBeNull()
  })

  /* The frame in the tab is as opaque as the preview's own, so dictation in
     it is listened for by the tab's recognizer, where the press was made. */
  test("listens for dictation in the tab with the tab's own recognizer", async () => {
    const host = (await preview('src="/frame.html" controls')) as Preview & {
      open: () => Window | null
    }
    const tabDocument = document.implementation.createHTMLDocument('')
    const tab = Object.assign(new EventTarget(), {
      document: tabDocument,
      opener: window,
      SpeechRecognition: FakeRecognition,
    }) as unknown as Window
    const original = window.open
    window.open = (() => tab) as unknown as typeof window.open
    const stand = document.createElement('iframe')
    document.body.append(stand)
    const target = stand.contentWindow as Window
    const heard: { kind?: string; text?: string }[] = []
    target.postMessage = ((message: { kind?: string; text?: string; type?: string }) => {
      if (message.type === 'helix-speech-heard') {
        heard.push(message)
      }
    }) as Window['postMessage']
    restore = () => {
      window.open = original
      stand.remove()
    }
    host.open()
    const frame = tabDocument.querySelector('iframe') as HTMLIFrameElement
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: target })
    tab.dispatchEvent(
      new MessageEvent('message', {
        data: { id: 3, lang: 'en-US', type: 'helix-speech-start' },
        origin: 'null',
        source: target,
      }),
    )
    await new Promise((settle) => setTimeout(settle, 0))
    expect(heard.map((one) => [one.kind, one.text])).toEqual([
      ['final', 'hello'],
      ['end', undefined],
    ])
  })
})

/**
 * The relay, from the page's side: what a frame may ask this element to fetch
 * for it, and that it asks nothing of the network on anyone else's behalf.
 */
describe('the relay', () => {
  const original = globalThis.fetch

  /** Stands a window of the page's own in for the frame's, and records what is sent to it and fetched. */
  const harness = async (attributes: string) => {
    const host = await preview(attributes)
    const frame = part(host, 'frame') as HTMLIFrameElement
    const stand = document.createElement('iframe')
    document.body.append(stand)
    const target = stand.contentWindow as Window
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: target })
    const answers: { body?: unknown; id: string; ok: boolean }[] = []
    target.postMessage = ((message: { body?: unknown; id: string; ok: boolean; type: string }) => {
      if (message.type === 'helix-preview-fetched') {
        answers.push(message)
      }
    }) as Window['postMessage']
    const fetched: string[] = []
    globalThis.fetch = (async (url: URL) => {
      fetched.push(String(url))
      return new Response('console.log(1)', { headers: { 'content-type': 'text/javascript' } })
    }) as unknown as typeof fetch
    /* An address for the page, which happy-dom's blank document lacks, so the
       frame's paths resolve against an origin as they do on a site. Set once
       the frames exist, so neither tries to load from it. */
    const dom = (window as unknown as { happyDOM?: { setURL: (url: string) => void } }).happyDOM
    const was = location.href
    dom?.setURL('https://site.test/helix/sandbox')
    restore = () => {
      globalThis.fetch = original
      delete (frame as { contentWindow?: Window | null }).contentWindow
      stand.remove()
      dom?.setURL(was)
    }
    const ask = async (path: string, from: Window = target, origin = 'null'): Promise<void> => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { as: 'text', id: `r-${path}`, path, type: 'helix-preview-fetch' },
          origin,
          source: from,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    return { answers, ask, fetched, target }
  }

  test('fetches a file under a named prefix and sends its body back to the frame', async () => {
    const { answers, ask, fetched } = await harness('src="/sandbox/frame.html" relay="/sandbox/"')
    await ask('./frame.js?v=1a2b3c4d')
    expect(fetched).toEqual([new URL('/sandbox/frame.js?v=1a2b3c4d', location.href).href])
    expect(answers).toEqual([
      {
        body: 'console.log(1)',
        contentType: 'text/javascript',
        id: 'r-./frame.js?v=1a2b3c4d',
        ok: true,
        type: 'helix-preview-fetched',
      } as never,
    ])
  })

  test('refuses a path outside the prefixes without fetching it', async () => {
    const { answers, ask, fetched } = await harness('src="/sandbox/frame.html" relay="/sandbox/"')
    await ask('/api/session')
    await ask('/sandbox/../api/session')
    expect(fetched).toEqual([])
    expect(answers.map((answer) => answer.ok)).toEqual([false, false])
  })

  test('relays nothing where `relay` is empty, the default', async () => {
    const { answers, ask, fetched } = await harness('src="/sandbox/frame.html"')
    await ask('/sandbox/frame.js')
    expect(fetched).toEqual([])
    expect(answers.map((answer) => answer.ok)).toEqual([false])
  })

  test('answers only its own frame, and only while the frame’s origin is opaque', async () => {
    const { answers, ask, fetched, target } = await harness(
      'src="/sandbox/frame.html" relay="/sandbox/"',
    )
    await ask('/sandbox/frame.js', window)
    await ask('/sandbox/frame.js', target, location.origin)
    expect(fetched).toEqual([])
    expect(answers).toEqual([])
  })
})
