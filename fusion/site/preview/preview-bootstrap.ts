/**
 * The preview document's first script, which loads the rest.
 *
 * Inlined into `frame.html` by `fusion/site/scripts/build-frame.mjs`, as this
 * function's own source called with its configuration, because it is what
 * loads `frame.js` and so cannot be inside it. It references nothing outside
 * its body for the same reason.
 *
 * **Each file is loaded directly first**, as a `<link>`, a `<script src>`, or
 * a `fetch`, which is all a public site ever needs. **Where that fails, the
 * page around the frame is asked for it**, with a `helix-preview-fetch`
 * message, and `Sandbox.Preview` fetches it with the page's cookies and sends
 * the body back. That is what makes a preview work behind a login such as a
 * Vercel preview's: the frame's opaque origin makes its own requests
 * cross-site, so they carry no login cookie and come back as the login page.
 * After one file has come through the page, the rest go to the page first.
 *
 * **The page is asked only while this document's origin is opaque.** A body
 * the page sends is run here as script, which is safe only in a sandbox: a
 * site that framed this document without one would give it the site's own
 * origin, and the parent answering would be that site. `self.origin` is
 * `"null"` exactly when the frame is sandboxed, so this checks it rather than
 * trusting that whoever framed it did. `frame-ancestors 'self'` on the
 * document says the same thing from the other side.
 */

/** What the build tells the bootstrap. */
export interface PreviewBootstrap {
  /** The brand faces, loaded through the page where the stylesheet was. */
  fonts: { file: string; name: string; weight: string }[]
  /** How long to wait for the page to answer, in milliseconds. */
  patience: number
  /** The frame's script, stamped. */
  script: string
  /** The frame's stylesheet, stamped. */
  styles: string
}

/** A file the page sent back. */
interface Relayed {
  body: ArrayBuffer | string
  contentType: string
}

export function bootstrap(config: PreviewBootstrap): void {
  const relayable = self.origin === 'null' && window.parent !== window
  const pending = new Map<
    string,
    { reject: (error: Error) => void; resolve: (value: Relayed) => void; timer: number }
  >()
  let asked = 0
  let throughPage = false

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      body?: ArrayBuffer | string
      contentType?: string
      id?: unknown
      ok?: unknown
      type?: unknown
    } | null
    if (event.source !== window.parent || data?.type !== 'helix-preview-fetched') {
      return
    }
    const waiting = typeof data.id === 'string' ? pending.get(data.id) : undefined
    if (!waiting || typeof data.id !== 'string') {
      return
    }
    pending.delete(data.id)
    clearTimeout(waiting.timer)
    if (data.ok === true && data.body !== undefined) {
      waiting.resolve({ body: data.body, contentType: data.contentType ?? '' })
    } else {
      waiting.reject(new Error('The page did not send it'))
    }
  })

  /** Asks the page for `path`, as text or as bytes. */
  const ask = (path: string, as: 'bytes' | 'text'): Promise<Relayed> =>
    new Promise((resolve, reject) => {
      if (!relayable) {
        reject(new Error(`${path} did not load`))
        return
      }
      asked += 1
      const id = `relay-${asked}`
      const timer = window.setTimeout(() => {
        pending.delete(id)
        reject(new Error(`${path} did not load, and the page did not send it`))
      }, config.patience)
      pending.set(id, { reject, resolve, timer })
      window.parent.postMessage({ as, id, path, type: 'helix-preview-fetch' }, '*')
    })

  /** Loads a classic script, directly or through the page. */
  const loadScript = (src: string): Promise<void> => {
    const relayed = (): Promise<void> =>
      ask(src, 'text').then(({ body }) => {
        throughPage = true
        const script = document.createElement('script')
        script.textContent = `${String(body)}\n//# sourceURL=${new URL(src, location.href).pathname}`
        document.head.append(script)
      })
    if (throughPage) {
      return relayed()
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = () => {
        script.remove()
        reject(new Error(`${src} did not load`))
      }
      document.head.append(script)
    }).catch(relayed)
  }

  /**
   * Loads the stylesheet, directly or through the page. Through the page, its
   * faces come through the page too, as `FontFace`s, and its own `@font-face`
   * rules are taken out, since each would fail as the stylesheet did.
   */
  const loadStyles = (href: string): void => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onerror = () => {
      link.remove()
      ask(href, 'text')
        .then(({ body }) => {
          throughPage = true
          const style = document.createElement('style')
          style.textContent = String(body).replace(/@font-face\s*\{[^}]*\}/g, '')
          document.head.prepend(style)
          for (const face of config.fonts) {
            ask(`/fonts/${face.file}`, 'bytes')
              .then(({ body: bytes }) => {
                const loaded = new FontFace(face.name, bytes as ArrayBuffer, {
                  display: 'swap',
                  style: 'normal',
                  weight: face.weight,
                })
                document.fonts.add(loaded)
                return loaded.load()
              })
              .catch((error: unknown) => console.error(String(error)))
          }
        })
        .catch((error: unknown) => console.error(String(error)))
    }
    document.head.prepend(link)
  }

  /**
   * `fetch`, falling back to the page for a file on this site that fails, such
   * as a model a graph reads. Only a `GET` with no body is relayed, and the
   * page decides which paths it will fetch.
   */
  const direct = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    if (request.method !== 'GET' || !relayable) {
      return direct(input, init)
    }
    const url = new URL(request.url)
    const path = `${url.pathname}${url.search}`
    const viaPage = async (): Promise<Response> => {
      const { body, contentType } = await ask(path, 'bytes')
      throughPage = true
      return new Response(body, { headers: { 'content-type': contentType } })
    }
    if (url.origin !== location.origin) {
      return direct(input, init)
    }
    if (throughPage) {
      return viaPage().catch(() => direct(input, init))
    }
    try {
      const response = await direct(input, init)
      /* A login that answers with a status rather than a redirect. */
      return response.status === 401 || response.status === 403
        ? viaPage().catch(() => response)
        : response
    } catch (error) {
      return viaPage().catch(() => {
        throw error
      })
    }
  }

  ;(window as { helixPreviewLoad?: (src: string) => Promise<void> }).helixPreviewLoad = loadScript
  loadStyles(config.styles)
  loadScript(config.script).catch((error: unknown) => console.error(String(error)))
}
