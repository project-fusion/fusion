/**
 * The capture driver: the Node half of `proof`, which runs Playwright.
 *
 * **The binary starts this once per run and sends it one request per line**
 * on standard input; every answer is one line of JSON on standard output.
 * Standard error is the run's own. `console.log` is sent there, and the binary
 * passes any other line on standard output that is not an answer through to
 * standard error, so a config's `inspect` cannot corrupt the protocol.
 *
 * - `config` imports the config file and answers with its values. Functions
 *   stay here, where they run.
 * - `start` serves the harness origin and launches Chromium.
 * - `capture` pictures entries, answering `shot` for each picture as it is
 *   taken, `item` when an entry is done, and `captured` at the end.
 * - `finish` hands the config's `inspect.report` every run it collected.
 * - `close` closes the browser and the server and exits.
 *
 * Any request that fails answers `error`, with the reason.
 *
 * **One navigation per entry for every shot.** The first shot loads the page;
 * each later one resizes the viewport, switches the emulated scheme, rewrites
 * the harness style and settles again. Measured on October 8, 2026 over 153
 * pictures of 51 examples, that took 242.6 ms a picture against 287.3 ms for a
 * navigation each, and every picture was pixel for pixel the same.
 *
 * **Node and Playwright, decided on October 8, 2026.** Chromium's work is about
 * 94% of the time of a picture, so a capture written in Rust over the browser
 * protocol is the same speed. It would also lose what Playwright already
 * tests: auto-waiting, disabled animations, request routing, media emulation,
 * `ariaSnapshot()`, Firefox and WebKit, and `playwright install --with-deps`.
 */
import { readFileSync, readSync, statSync, writeSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { pathToFileURL } from 'node:url'

/** The `id` of the harness `<style>` the binary writes into every page. */
const STYLE_ID = 'proof-harness'

/* **Read and written synchronously, on the descriptors themselves.** Bun
   1.1.43, the runtime Fusion's CI pins, hands a script nothing from a piped
   standard input until the pipe closes, so a stream reader would wait for a
   request the binary is waiting to have answered. `readSync` on descriptor 0
   returns each line as it arrives, in Bun and in Node. A request is read only
   when the last one is answered, which is the one time this has nothing else
   to do. Answers are written with `writeSync` for the same reason: the next
   thing after an answer is that blocking read, and an answer still queued
   behind it would never reach the binary. */
for (const name of ['debug', 'info', 'log']) {
  console[name] = console.error
}

/** Blocks for `milliseconds`, for a descriptor that asked to be retried. */
const pause = (milliseconds) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)

/** One answer, written whole. */
const say = (message) => {
  const bytes = Buffer.from(`${JSON.stringify(message)}\n`)
  for (let at = 0; at < bytes.length; ) {
    try {
      at += writeSync(1, bytes, at)
    } catch (caught) {
      if (caught?.code !== 'EAGAIN') {
        throw caught
      }
      pause(2)
    }
  }
}

const TYPES = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.mp4': 'video/mp4',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** The run's state, filled in by the requests in the order they come. */
const state = {
  browser: undefined,
  config: undefined,
  /**
   * Each document by the key of the request that asked for it. Two takes of
   * one entry can load at once on two pages, each styled for its own shot, so
   * the document is named in the query and the path is the entry's.
   */
  documents: new Map(),
  lanes: [],
  network: 'origin',
  origin: undefined,
  /** `/source/name/` to the directory relative requests resolve in, and its renames. */
  pages: new Map(),
  /** What `inspect.run` returned for each entry, for `inspect.report`. */
  runs: [],
  serve: [],
  server: undefined,
  workers: 1,
}

/**
 * `relative` resolved inside `directory`, or undefined when it escapes it.
 *
 * The directory is resolved too, because a mount named with a trailing slash
 * arrives as `fonts/`, and `fonts/` plus a separator is a prefix no file has.
 */
const inside = (directory, relative) => {
  const root = resolve(directory)
  const file = resolve(root, relative)
  return file === root || file.startsWith(root + sep) ? file : undefined
}

/** What the server answers for `path`: a file, a document, or nothing. */
const lookup = (path, document) => {
  for (const { directory, file, url } of state.serve) {
    if (directory && path.startsWith(url)) {
      return { file: inside(file, path.slice(url.length)) }
    }
    if (!directory && path === url) {
      return { file }
    }
  }
  /* The page whose path is the longest prefix of this one, so a relative
     request from a page resolves inside that page's directory. */
  for (let at = path.lastIndexOf('/'); at >= 0; at = path.lastIndexOf('/', at - 1)) {
    const page = state.pages.get(path.slice(0, at + 1))
    if (page !== undefined) {
      const rest = path.slice(at + 1)
      if (rest === '') {
        return { html: state.documents.get(document) }
      }
      return { file: inside(page.dir, page.files[rest] ?? rest) }
    }
    if (at === 0) {
      break
    }
  }
  return {}
}

const respond = (request, response) => {
  let path
  let document
  try {
    const url = new URL(request.url ?? '/', 'http://proof')
    path = decodeURIComponent(url.pathname)
    document = url.searchParams.get('proof')
  } catch {
    response.writeHead(400).end()
    return
  }
  const found = lookup(path, document)
  if (found.html !== undefined) {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(found.html)
    return
  }
  let body
  try {
    if (found.file === undefined || !statSync(found.file).isFile()) {
      throw new Error('not a file')
    }
    body = readFileSync(found.file)
  } catch {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(found.file).toLowerCase()] ?? 'application/octet-stream',
  })
  response.end(body)
}

/**
 * Waits for every custom element on the page to be defined, and names the
 * tags nothing defines.
 *
 * **Bounded, because `whenDefined` on a tag nothing registers never settles.**
 * Unbounded, a page naming an element the bundle does not define hangs the
 * run with no output. This gives up after five seconds and names the tags.
 */
const upgrades = (page) =>
  page.evaluate(async () => {
    const pending = [
      ...new Set([...document.querySelectorAll(':not(:defined)')].map((one) => one.localName)),
    ]
    await Promise.race([
      Promise.all(pending.map((tag) => customElements.whenDefined(tag))),
      new Promise((done) => setTimeout(done, 5000)),
    ])
    return pending.filter((tag) => customElements.get(tag) === undefined)
  })

/**
 * Waits for the page to hold still: three frames, the fonts, each element's
 * own ready signal, then boxes and scroll offsets unchanged for three frames.
 *
 * **Three frames, because a framework may render in a task of its own** and
 * an example that sets state in an effect needs the render after it.
 *
 * **Each element's ready signal, when the config names one.** A component
 * library that publishes a promise for "rendered and styled" knows better
 * than any frame count. Without it, Fusion's `pagination/footer` differed by
 * 419 pixels on one run and 842 on the next from the same two files.
 * Bounded, so an element that never resolves cannot hang the run.
 *
 * **Then geometry and scroll held for three frames**, which `animations:
 * 'disabled'` does not cover. A programmatic smooth scroll is no animation:
 * `carousel/controlled` reported `scrollLeft` of 135, 184 and 239 on three
 * loads. A control that measures itself settles a frame or two late, and
 * `pagination/footer` measured 272, 273 and 275 wide. Bounded at 120 frames,
 * so a page that never stops moving reports a difference and does not hang.
 */
const still = (page, readyProperty) =>
  page.evaluate(async (readyProperty) => {
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
    await document.fonts.ready
    if (readyProperty) {
      await Promise.race([
        Promise.all(
          [...document.querySelectorAll('*')]
            .map((one) => one[readyProperty])
            .filter((one) => one instanceof Promise),
        ),
        new Promise((done) => setTimeout(done, 5000)),
      ])
    }
    const shape = () =>
      [...document.querySelectorAll('*')]
        .map((one) => {
          const box = one.getBoundingClientRect()
          return `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)},${one.scrollLeft},${one.scrollTop}`
        })
        .join('|')
    let last = shape()
    for (let held = 0, spent = 0; held < 3 && spent < 120; spent += 1) {
      await new Promise((done) => requestAnimationFrame(done))
      const now = shape()
      held = now === last ? held + 1 : 0
      last = now
    }
  }, readyProperty ?? null)

/** One entry, every shot of it from one navigation. */
const take = async (page, item, readyProperty) => {
  const started = performance.now()
  let error = null
  try {
    for (const [index, shot] of item.shots.entries()) {
      await page.setViewportSize({ height: shot.height, width: shot.width })
      await page.emulateMedia({ colorScheme: shot.scheme })
      if (index === 0) {
        await page.goto(`${state.origin}${item.path}?proof=${encodeURIComponent(item.key)}`, {
          waitUntil: 'load',
        })
        const missing = await upgrades(page)
        if (missing.length > 0) {
          throw new Error(
            `nothing defines ${missing.map((tag) => `<${tag}>`).join(', ')}, after five seconds of waiting`,
          )
        }
      } else if (shot.harness !== null) {
        await page.evaluate(
          ([id, rules]) => {
            const style = document.getElementById(id)
            if (style !== null) {
              style.textContent = rules
            }
          },
          [STYLE_ID, shot.harness],
        )
      }
      await still(page, readyProperty)
      /* A face the page asked for and could not load draws in the platform's
         fallback, and a baseline taken that way defends the wrong face. */
      const broken = await page.evaluate(() =>
        [...document.fonts].filter((face) => face.status === 'error').map((face) => face.family),
      )
      if (broken.length > 0) {
        throw new Error(`the font ${[...new Set(broken)].join(', ')} did not load`)
      }
      /* `animations: 'disabled'` cancels infinite animations to their first
         frame and finishes finite ones, so a picture is of one definite moment:
         Fusion's spinner moved 17 pixels between two takes without it. */
      const png = await page.screenshot({ animations: 'disabled', fullPage: true })
      say({ key: item.key, op: 'shot', png: png.toString('base64'), shot: shot.name })
      /* After the first picture, on the page that was pictured, so what the
         inspection reads cannot move a pixel of that picture. */
      if (index === 0 && item.inspect) {
        state.runs.push({
          entry: item.entry,
          result: await state.config.inspect.run({ entry: item.entry, page }),
        })
      }
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message.split('\n')[0] : String(caught)
  }
  say({ error, key: item.key, op: 'item', seconds: (performance.now() - started) / 1000 })
}

/**
 * A page per worker, each in a context of its own, made when first needed and
 * kept for every capture after.
 *
 * **Reduced motion on the context**, because `animations: 'disabled'` reaches
 * only what the browser animates: a WebGL field driven by its own
 * `requestAnimationFrame` differed by 26,883 pixels between two loads.
 * Measured across 181 of Fusion's families, no other picture changed under it.
 *
 * **Every request off the harness origin is refused**, unless the config opens
 * the network. A baseline that loaded media from another host recorded
 * whatever that host returned, and a refusal by the resolver arrives in
 * whatever time the resolver takes.
 */
const lanes = async (count) => {
  while (state.lanes.length < count) {
    const context = await state.browser.newContext({
      reducedMotion: 'reduce',
      viewport: { height: 800, width: 1280 },
    })
    if (state.network === 'origin') {
      await context.route('**/*', (route) => {
        let origin
        try {
          origin = new URL(route.request().url()).origin
        } catch {
          origin = undefined
        }
        return origin === state.origin ? route.continue() : route.abort()
      })
    }
    state.lanes.push(await context.newPage())
  }
  return state.lanes.slice(0, count)
}

const handlers = {
  async capture({ items, readyProperty }) {
    for (const item of items) {
      state.documents.set(item.key, item.html)
      state.pages.set(item.path, { dir: item.dir, files: item.files ?? {} })
    }
    /* **Worker `k` takes items `k`, `k + n`, and so on**, rather than the next
       free one off a queue, so which entries shared a page is a function of
       the worker count and a finding can be reproduced by running again. */
    const pages = await lanes(Math.min(state.workers, items.length))
    await Promise.all(
      pages.map(async (page, k) => {
        for (let at = k; at < items.length; at += pages.length) {
          await take(page, items[at], readyProperty)
        }
      }),
    )
    say({ op: 'captured' })
  },

  async close() {
    await state.browser?.close().catch(() => {})
    state.server?.close()
    process.exit(0)
  },

  async config({ path }) {
    const loaded = await import(pathToFileURL(path).href)
    const config = loaded.default ?? loaded.config
    if (config === null || typeof config !== 'object') {
      throw new Error(`${path} exports no config: export one as the default`)
    }
    if (config.inspect !== undefined && typeof config.inspect.run !== 'function') {
      throw new Error(
        '`inspect.run` is a function, called with the page after each entry is pictured',
      )
    }
    state.config = config
    const { inspect, ...values } = config
    say({
      config: { ...JSON.parse(JSON.stringify(values)), inspect: inspect !== undefined },
      op: 'config',
    })
  },

  async finish({ update }) {
    const reported = await state.config.inspect?.report?.(state.runs, { update })
    say({ failed: Boolean(reported?.failed), op: 'finished' })
  },

  async start({ network, serve, workers }) {
    state.network = network
    state.workers = workers
    state.serve = Object.entries(serve)
      .map(([url, file]) => ({ directory: url.endsWith('/'), file, url }))
      .sort((a, b) => b.url.length - a.url.length)
    state.server = createServer(respond)
    await new Promise((done) => state.server.listen(0, '127.0.0.1', done))
    state.origin = `http://127.0.0.1:${state.server.address().port}`
    const { chromium } = await import('playwright')
    state.browser = await chromium.launch()
    say({ browser: `chromium ${state.browser.version()}`, op: 'started' })
  },
}

const input = Buffer.alloc(1 << 16)
const decoder = new StringDecoder('utf8')
let pending = ''

/** The next request line, or undefined once the binary has closed the pipe. */
const request = () => {
  for (;;) {
    const at = pending.indexOf('\n')
    if (at >= 0) {
      const line = pending.slice(0, at)
      pending = pending.slice(at + 1)
      return line
    }
    let read
    try {
      read = readSync(0, input, 0, input.length, null)
    } catch (caught) {
      if (caught?.code === 'EAGAIN') {
        pause(5)
        continue
      }
      if (caught?.code === 'EOF') {
        return undefined
      }
      throw caught
    }
    if (read === 0) {
      return undefined
    }
    pending += decoder.write(input.subarray(0, read))
  }
}

/* One request at a time, each answered before the next is read. */
for (let line = request(); line !== undefined; line = request()) {
  try {
    const asked = JSON.parse(line)
    const handler = handlers[asked.op]
    if (handler === undefined) {
      throw new Error(`no request is called \`${asked.op}\``)
    }
    await handler(asked)
  } catch (caught) {
    say({ message: caught instanceof Error ? caught.message : String(caught), op: 'error' })
  }
}
/* The binary went away, so nothing is waiting for the browser. */
await handlers.close()
