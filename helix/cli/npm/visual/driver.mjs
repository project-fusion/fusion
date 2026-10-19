/**
 * The capture driver: the Node half of `helix visual`, which runs Playwright.
 *
 * **The binary starts this once per run and sends it one request per line**
 * on standard input; every answer is one line of JSON on standard output.
 * Standard error is the run's own. `console.log` is sent there, and the binary
 * passes any other line on standard output that is not an answer through to
 * standard error, so a config's `inspect` cannot corrupt the protocol.
 *
 * - `config` imports the config file and answers with its values. Functions
 *   stay here, where they run.
 * - `fetch` and `wait` ask a server for a page, or wait for it to answer, so
 *   the binary needs no HTTP of its own.
 * - `prepare` runs a pairs source's `prepare` and answers with its pairs.
 * - `start` serves the harness origin and launches Chromium.
 * - `capture` pictures entries, answering `shot` for each picture as it is
 *   taken, `item` when an entry is done, and `captured` at the end.
 * - `finish` hands the config's `inspect.report` every run it collected.
 * - `diagnose` opens pages and runs the installed diagnostics in each, for
 *   `helix diagnostics --once`.
 * - `close` closes the browser and the server and exits.
 *
 * Any request that fails answers `error`, with the reason.
 *
 * **One navigation for each width an entry is pictured at.** The first shot
 * loads the page; a later one at the same width switches the emulated scheme,
 * rewrites the harness style and settles again. Measured on October 8, 2026
 * over 153 pictures of 51 examples, that took 242.6 ms a picture against 287.3
 * ms for a navigation each, and every picture was pixel for pixel the same.
 *
 * **A new width loads the page again**, served styled for that shot. A page
 * resized in place can keep what a fresh one never has, and the second take,
 * which a baseline is written from, is always a fresh load: on Linux a
 * dialog's text resized from 640 to 390 kept grayscale antialiasing where a
 * fresh load at 390 drew it in color, so the shot needed a second take in
 * every run. A change of scheme stays in place, where it tests a component
 * that has to follow the page's colors.
 *
 * **Node and Playwright, decided on October 8, 2026.** Chromium's work is about
 * 94% of the time of a picture, so a capture written in Rust over the browser
 * protocol is the same speed. It would also lose what Playwright already
 * tests: auto-waiting, disabled animations, request routing, media emulation,
 * `ariaSnapshot()`, Firefox and WebKit, and `playwright install --with-deps`.
 */
import { existsSync, readFileSync, readSync, statSync, writeSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { pathToFileURL } from 'node:url'
import { boxesOf, readPage } from './checks.mjs'

/** The `id` of the harness `<style>` the binary writes into every page. */
const STYLE_ID = 'helix-visual-harness'

/** Where `diagnose` serves the diagnostics on a page's own origin. */
const DIAGNOSTICS = '__helix-diagnostics'

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
  /** Each entry's harness rules by shot, so a later shot loads styled for itself. */
  harnesses: new Map(),
  lanes: [],
  /** Selectors painted over in every picture. */
  mask: [],
  network: 'origin',
  origin: undefined,
  /** The origins requests may reach: the harness's and each source's server. */
  origins: new Set(),
  /** `/source/name/` to the directory relative requests resolve in, and its renames. */
  pages: new Map(),
  /** Each pairs source's `prepare` and `check`, by the source's name. */
  pairs: new Map(),
  /** What `inspect.run` returned for each entry, for `inspect.report`. */
  runs: [],
  serve: [],
  server: undefined,
  /** A stylesheet applied while each picture is taken. */
  style: undefined,
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
      /* A side with no directory of its own serves nothing beside it. */
      return { file: page.dir ? inside(page.dir, page.files[rest] ?? rest) : undefined }
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
  let shot
  try {
    const url = new URL(request.url ?? '/', 'http://visual')
    path = decodeURIComponent(url.pathname)
    document = url.searchParams.get('visual')
    shot = url.searchParams.get('shot')
  } catch {
    response.writeHead(400).end()
    return
  }
  const found = lookup(path, document)
  if (found.html !== undefined) {
    /* Styled for the shot it is loaded for, where that is not the first. */
    const rules = shot === null ? undefined : state.harnesses.get(document)?.[Number(shot)]
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(
      typeof rules === 'string'
        ? found.html.replace(
            new RegExp(`(<style id="${STYLE_ID}">)[^<]*(</style>)`),
            (_, open, close) => `${open}${rules}${close}`,
          )
        : found.html,
    )
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
 * run with no output. This gives up after {@link UPGRADES} seconds and names
 * the tags.
 */
const upgrades = (page, prefix) =>
  page.evaluate(
    async ({ prefix, seconds }) => {
      const pending = [
        ...new Set([...document.querySelectorAll(':not(:defined)')].map((one) => one.localName)),
      ].filter((tag) => tag.startsWith(prefix))
      await Promise.race([
        Promise.all(pending.map((tag) => customElements.whenDefined(tag))),
        new Promise((done) => setTimeout(done, seconds * 1000)),
      ])
      return pending.filter((tag) => customElements.get(tag) === undefined)
    },
    { prefix: prefix ?? '', seconds: UPGRADES },
  )

/**
 * **How long a page has to define its elements after it loads: twenty
 * seconds**, a third of what one shot may take. The bound only stops a run
 * hanging on a tag nothing registers, and a page that registers late is slow,
 * which a picture does not judge. Five seconds failed the site's theme builder
 * on two CI runs in a row on October 10, 2026: its first style pass over
 * 15,638 elements and Helix's chunk took 1.7 seconds on an M-series Mac, and a
 * shared runner takes several times that.
 */
const UPGRADES = 20

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
    await Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 10000))])
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

/**
 * `promise`, or a refusal after `seconds`.
 *
 * **A timer of its own, because an abort signal is not one everywhere.** A
 * server that accepts a connection and never answers leaves a fetch waiting,
 * and a runtime that does not honor `AbortSignal.timeout` on it waits with it.
 */
const within = (seconds, promise, what) => {
  let timer
  const expired = new Promise((_, refuse) => {
    timer = setTimeout(
      () => refuse(new Error(`${what} did not answer within ${seconds} seconds`)),
      seconds * 1000,
    )
  })
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer))
}

/**
 * The accessibility snapshot of the page, without what `mask` and `aria.hide`
 * name.
 *
 * **What a run paints over, it does not judge in the snapshot either.** A
 * masked version number is still text in the accessibility tree, so every
 * release would change the snapshot that the mask kept out of the picture.
 * Each masked element is given `aria-hidden` for the snapshot, and the value
 * it had is put back after.
 */
const ariaSnapshot = async (page, mask) => {
  const MARK = 'data-helix-visual-aria-hidden'
  for (const selector of mask) {
    await page.locator(selector).evaluateAll((elements, mark) => {
      for (const element of elements) {
        element.setAttribute(mark, element.getAttribute('aria-hidden') ?? '')
        element.setAttribute('aria-hidden', 'true')
      }
    }, MARK)
  }
  try {
    return `${await page.locator('body').ariaSnapshot()}\n`
  } finally {
    /* A locator, as above, so an element inside a shadow root is found too. */
    await page.locator(`[${MARK}]`).evaluateAll((elements, mark) => {
      for (const element of elements) {
        const was = element.getAttribute(mark)
        if (was === '') {
          element.removeAttribute('aria-hidden')
        } else {
          element.setAttribute('aria-hidden', was)
        }
        element.removeAttribute(mark)
      }
    }, MARK)
  }
}

/**
 * Each code block that draws all of its text in one color, as a sentence.
 *
 * **A highlighter that fails leaves nothing to say so.** On October 8, 2026
 * every code block on Fusion's site lost its colors because two copies of the
 * highlighting library were installed: the parser tagged tokens with one and
 * the styles read the other, nothing threw, and the text came out plain. A
 * block of `minimum` characters or more whose every character resolves to one
 * color is that fault, and it needs no baseline to see.
 */
const codeBlocks = (page, { minimum, selector }) =>
  page.evaluate(
    ({ minimum, selector }) => {
      const found = []
      for (const block of document.querySelectorAll(selector)) {
        const colors = new Set()
        let characters = 0
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const text = node.textContent.replace(/\s+/g, '')
          if (text === '' || node.parentElement === null) {
            continue
          }
          colors.add(getComputedStyle(node.parentElement).color)
          characters += text.length
        }
        if (characters >= minimum && colors.size === 1) {
          const sample = block.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)
          found.push(
            `a code block draws its ${characters} characters in one color, ${[...colors][0]}: "${sample}"`,
          )
        }
      }
      return found
    },
    { minimum, selector },
  )

/**
 * Asks every page in `context` for its state tools before the page loads,
 * since Helix puts them on `globalThis` only where something asked for them.
 */
const askForState = (context) =>
  context.addInitScript(() => {
    globalThis[Symbol.for('fusion.dev/helix/state')] ??= true
  })

/**
 * Puts back the screen an entry's `<stem>.state.json` saved, through the
 * page's own Helix: `restoreState` from `@fusion.dev/helix-core`, which the
 * first copy of Helix to load puts on `globalThis`, since `askForState`
 * asked for it. An entry whose state names
 * an element the page no longer draws, or one the page refused, fails, since
 * its picture would not be of the screen the state describes.
 */
const restore = async (page, state) => {
  const report = await page.evaluate(async (saved) => {
    const tools = globalThis[Symbol.for('fusion.dev/helix/state')]
    if (!tools) {
      return { error: 'the page has no Helix to restore its state with' }
    }
    return tools.restoreState(saved)
  }, state)
  if (report.error) {
    throw new Error(report.error)
  }
  const wrong = [
    ...report.missed.map((path) => `${path} is not on the page`),
    ...report.refused.map((path) => `${path} refused its state`),
  ]
  if (wrong.length > 0) {
    throw new Error(`the saved state did not take: ${wrong.join('; ')}`)
  }
}

/** One entry, every shot of it from one navigation. */
const take = async (lane, item, { elements, readyProperty }, progress) => {
  const { page } = lane
  const started = performance.now()
  let error = null
  let problems = []
  let findings = []
  /* Every ink and ground pair contrast measured on the page. */
  let painted = []
  let aria = null
  /* The color schemes contrast has been read in. */
  const read = new Set()
  lane.errors.length = 0
  lane.messages.length = 0
  /* The width the page was last loaded at. */
  let loaded
  try {
    for (const [index, shot] of item.shots.entries()) {
      const fresh = index === 0 || shot.width !== loaded
      progress.stage = fresh ? 'loading the page' : `settling for ${shot.name}`
      await page.setViewportSize({ height: shot.height, width: shot.width })
      await page.emulateMedia({ colorScheme: shot.scheme })
      if (fresh) {
        /* An entry on a server has its own address. An HTML entry is served
           here, its document named in the query, and the shot it is styled
           for where that is not the first. */
        const address =
          item.url ??
          `${state.origin}${item.path}?visual=${encodeURIComponent(item.key)}${index > 0 ? `&shot=${index}` : ''}`
        await page.goto(address, { waitUntil: 'load' })
        loaded = shot.width
        const missing = await upgrades(page, elements)
        if (missing.length > 0) {
          throw new Error(
            `nothing defines ${missing.map((tag) => `<${tag}>`).join(', ')}, after ${UPGRADES} seconds of waiting`,
          )
        }
        if (item.state) {
          await restore(page, item.state)
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
      progress.stage = `settling for ${shot.name}`
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
      progress.stage = `capturing ${shot.name}`
      /* A masked element is painted over in one fixed color, so what changes
         on its own, a version number, moves no pixel. */
      const png = await page.screenshot({
        animations: 'disabled',
        fullPage: true,
        mask: state.mask.map((selector) => page.locator(selector)),
        maskColor: '#ff00ff',
        style: state.style,
      })
      if (progress.abandoned) {
        return
      }
      /* Where the named elements sat in this picture, when the run asked:
         written into a baseline, and read to say what a change happened to. */
      const boxes = item.boxes ? await boxesOf(page) : null
      say({ boxes, key: item.key, op: 'shot', png: png.toString('base64'), shot: shot.name })
      /* After the first picture, on the page that was pictured, so what the
         inspection reads cannot move a pixel of that picture. */
      if (index === 0 && item.inspect) {
        progress.stage = 'inspecting the page'
        state.runs.push({
          entry: item.entry,
          result: await state.config.inspect.run({ entry: item.entry, page }),
        })
      }
      /* The page checks and the accessibility snapshot, on the page that was
         pictured, after its first picture. Contrast reads again after the
         first picture in each color scheme, because a palette has two halves
         and only one is on screen at a time. */
      if (index === 0 && item.checks?.code) {
        progress.stage = 'checking its code blocks'
        const blocks = await codeBlocks(page, item.checks.code)
        findings = findings.concat(blocks.map((text) => ({ check: 'code', text })))
      }
      const contrast = item.checks?.contrast && !read.has(shot.scheme)
      if ((index === 0 && (item.checks?.clipped || item.checks?.overlap)) || contrast) {
        progress.stage = 'reading the page'
        read.add(shot.scheme)
        const reading = await readPage(page, {
          clipped: index === 0 ? (item.checks.clipped ?? null) : null,
          contrast: contrast ? { ...item.checks.contrast, scheme: shot.scheme } : null,
          overlap: index === 0 ? (item.checks.overlap ?? null) : null,
        })
        findings = findings.concat(reading.findings)
        painted = painted.concat(reading.pairs)
      }
      if (index === 0 && item.aria) {
        progress.stage = 'taking its accessibility snapshot'
        aria = await ariaSnapshot(page, [...state.mask, ...state.hide])
      }
      /* A pair's own check, on each side's page after its first picture. */
      if (index === 0 && item.check) {
        progress.stage = 'checking the page'
        const found = await state.pairs
          .get(item.check)
          .check({ console: [...lane.messages], entry: item.entry, page })
        problems = (Array.isArray(found) ? found : found ? [found] : []).map(String)
      }
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message.split('\n')[0] : String(caught)
  }
  if (progress.abandoned) {
    return
  }
  const seconds = (performance.now() - started) / 1000
  console.error(
    `helix: ${item.key}: ${error === null ? `${item.shots.length} ${item.shots.length === 1 ? 'shot' : 'shots'}` : 'failed'} in ${seconds.toFixed(1)} s`,
  )
  say({
    aria,
    error,
    errors: item.errors ? [...lane.errors] : [],
    findings,
    key: item.key,
    op: 'item',
    painted,
    problems,
    seconds,
  })
}

/**
 * Seconds an entry may take for each of its shots before it is given up on.
 *
 * **Every wait in a picture is bounded, and so is the whole of one.** A page
 * that stops drawing frames leaves an `evaluate` waiting on a frame that
 * never comes, and an unbounded run is a job that hangs until CI kills it and
 * says nothing about which page did it.
 */
const PER_SHOT = 60

/**
 * One entry on the lane's page, given up on after its time with the stage it
 * reached named. The page it was stuck on is closed and the lane gets a new
 * one in the same context, so the entries after it start clean.
 */
const bounded = async (lane, item, settle) => {
  const progress = { abandoned: false, stage: 'starting' }
  const limit = PER_SHOT * item.shots.length
  let timer
  const expired = new Promise((done) => {
    timer = setTimeout(() => done(true), limit * 1000)
  })
  const finished = await Promise.race([take(lane, item, settle, progress), expired])
  clearTimeout(timer)
  if (finished !== true) {
    return
  }
  progress.abandoned = true
  const message = `did not finish in ${limit} seconds, stuck ${progress.stage}`
  console.error(`helix: ${item.key}: ${message}`)
  say({ error: message, key: item.key, op: 'item', seconds: limit })
  const context = lane.page.context()
  await lane.page.close().catch(() => {})
  lane.page = await listened(lane, await context.newPage())
}

/**
 * `page`, with every console message, and the errors and uncaught exceptions
 * apart, recorded on `lane`, which `take` empties before each entry. A pair
 * names an error one side logged and the other did not, and a pairs source's
 * `check` is handed the messages, a warning being something only it can judge.
 */
const listened = (lane, page) => {
  page.on('console', (message) => {
    lane.messages.push({ text: message.text(), type: message.type() })
    if (message.type() === 'error') {
      lane.errors.push(message.text())
    }
  })
  page.on('pageerror', (caught) => lane.errors.push(caught.message))
  return page
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
    await askForState(context)
    if (state.network === 'origin') {
      await context.route('**/*', (route) => {
        let origin
        try {
          origin = new URL(route.request().url()).origin
        } catch {
          origin = undefined
        }
        return state.origins.has(origin) ? route.continue() : route.abort()
      })
    }
    const lane = { errors: [], messages: [] }
    lane.page = listened(lane, await context.newPage())
    state.lanes.push(lane)
  }
  return state.lanes.slice(0, count)
}

const handlers = {
  async capture({ elements, items, readyProperty }) {
    for (const item of items.filter((one) => one.path !== undefined)) {
      state.documents.set(item.key, item.html)
      state.harnesses.set(
        item.key,
        item.shots.map((shot) => shot.harness),
      )
      state.pages.set(item.path, { dir: item.dir, files: item.files ?? {} })
    }
    /* **Worker `k` takes items `k`, `k + n`, and so on**, rather than the next
       free one off a queue, so which entries shared a page is a function of
       the worker count and a finding can be reproduced by running again. */
    const taken = await lanes(Math.min(state.workers, items.length))
    await Promise.all(
      taken.map(async (lane, k) => {
        for (let at = k; at < items.length; at += taken.length) {
          console.error(`helix: ${items[at].key}: picturing`)
          await bounded(lane, items[at], { elements, readyProperty })
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
    /* A pairs source's functions stay here and are reported as given. */
    const sources = (config.sources ?? []).map((source) => {
      if (source?.kind !== 'pairs') {
        return source
      }
      if (typeof source.prepare !== 'function') {
        throw new Error(
          `the pairs source \`${source.name}\` needs \`prepare\`, a function that returns its pairs`,
        )
      }
      if (source.check !== undefined && typeof source.check !== 'function') {
        throw new Error(
          `the pairs source \`${source.name}\` gives a \`check\` that is not a function`,
        )
      }
      state.pairs.set(source.name, { check: source.check, prepare: source.prepare })
      return { ...source, check: source.check !== undefined, prepare: true }
    })
    const { inspect, ...values } = config
    say({
      config: {
        ...JSON.parse(JSON.stringify({ ...values, sources })),
        inspect: inspect !== undefined,
      },
      op: 'config',
    })
  },

  /* **Each page's own diagnostics, with nothing added to the app.** The
     installed `@fusion.dev/helix-diagnostics` is served on each page's own
     origin, under a path no app uses, so a policy that allows only `'self'`
     scripts allows it, and the page imports it once it holds still and runs
     one `diagnose()` against the installed manifests. The runtime events the
     library logged as the page loaded are in the run, which is the half a
     read of the code cannot see. */
  async diagnose({ dist, file, readyProperty, tiers, urls }) {
    const { chromium } = await playwright()
    state.browser ??= await chromium.launch()
    const context = await state.browser.newContext({ reducedMotion: 'reduce' })
    await context.route(`**/${DIAGNOSTICS}/**`, async (route) => {
      const name = new URL(route.request().url()).pathname.split(`/${DIAGNOSTICS}/`)[1] ?? ''
      const path = inside(dist, name)
      if (path === undefined || !existsSync(path) || !statSync(path).isFile()) {
        await route.fulfill({ status: 404 })
        return
      }
      await route.fulfill({ body: readFileSync(path), contentType: 'text/javascript' })
    })
    const runs = []
    for (const url of urls) {
      const page = await context.newPage()
      try {
        const answered = await page.goto(url, { waitUntil: 'load' })
        /* A page that is not there is no clean page. */
        if (answered !== null && !answered.ok()) {
          throw new Error(`answered ${answered.status()}`)
        }
        await still(page, readyProperty)
        runs.push(
          await page.evaluate(
            async ({ entry, file, tiers }) => {
              const { diagnose } = await import(entry)
              return diagnose({ environment: 'development', file: file ?? undefined, tiers })
            },
            { entry: `/${DIAGNOSTICS}/index.js`, file, tiers },
          ),
        )
      } catch (caught) {
        runs.push({ error: caught instanceof Error ? caught.message : String(caught), url })
      } finally {
        await page.close().catch(() => {})
      }
    }
    await context.close().catch(() => {})
    say({ op: 'diagnosed', runs })
  },

  async fetch({ url }) {
    const answer = await within(30, fetch(url, { redirect: 'follow' }), url)
    say({
      ok: answer.ok,
      op: 'fetched',
      status: answer.status,
      text: await within(30, answer.text(), url),
    })
  },

  async finish({ update }) {
    const reported = await state.config.inspect?.report?.(state.runs, { update })
    say({ failed: Boolean(reported?.failed), op: 'finished' })
  },

  async prepare({ changed, source }) {
    const pair = state.pairs.get(source)
    if (pair === undefined) {
      throw new Error(`no pairs source is called \`${source}\``)
    }
    const made = await pair.prepare({ changed: changed ?? undefined })
    const answer = Array.isArray(made) ? { pairs: made } : (made ?? {})
    if (!Array.isArray(answer.pairs)) {
      throw new Error(`\`prepare\` for \`${source}\` returned no \`pairs\` array`)
    }
    say({
      note: answer.note ?? null,
      op: 'prepared',
      pairs: answer.pairs,
      serve: answer.serve ?? {},
    })
  },

  async start({ hide = [], mask = [], network, origins = [], serve, style = null, workers }) {
    state.hide = hide
    state.mask = mask
    state.style = style ?? undefined
    state.network = network
    state.workers = workers
    state.serve = Object.entries(serve)
      .map(([url, file]) => ({ directory: url.endsWith('/'), file, url }))
      .sort((a, b) => b.url.length - a.url.length)
    state.server = createServer(respond)
    await new Promise((done) => state.server.listen(0, '127.0.0.1', done))
    state.origin = `http://127.0.0.1:${state.server.address().port}`
    state.origins = new Set([state.origin, ...origins])
    const { chromium } = await playwright()
    state.browser = await chromium.launch()
    say({ browser: `chromium ${state.browser.version()}`, op: 'started' })
  },

  /* **Each group asked in turn, and an answer that fails is one group's
     failure.** A key that is missing or refused fails every request alike,
     so the first such failure is the answer for the rest. */
  async triage({ groups, model, provider, system, url }) {
    const settings = { model, system, url }
    const answers = []
    let stopped = null
    let client = null
    if (provider === 'anthropic') {
      try {
        client = new (await anthropic())()
      } catch (caught) {
        stopped = caught instanceof Error ? caught.message.split('\n')[0] : String(caught)
      }
    }
    for (const group of groups) {
      if (stopped !== null) {
        answers.push({ error: stopped })
        continue
      }
      try {
        const ask = () =>
          provider === 'anthropic' ? askClaude(client, settings, group) : askOllama(settings, group)
        let answer = await ask()
        /* A verdict with no reason is asked once more, and the second answer
           is kept with the tokens of both. */
        if (!answer.error && String(answer.explanation ?? '').trim() === '') {
          const again = await ask()
          answer = {
            ...again,
            input: answer.input + again.input,
            output: answer.output + again.output,
          }
        }
        answers.push(answer)
      } catch (caught) {
        /* The API's own sentence when it gave one, without the request id
           that makes every failure's text unique. */
        const said = caught?.error?.error?.message
        const why =
          typeof said === 'string'
            ? `${caught.status}: ${said}`
            : caught instanceof Error
              ? caught.message.split('\n')[0]
              : String(caught)
        answers.push({ error: why })
        /* A refused key, an endpoint that is down, or the same failure
           twice running, a balance that has run out among them, is one that
           every request after it would meet. */
        const before = answers.at(-2)
        if (
          caught?.status === 401 ||
          caught?.status === 403 ||
          caught?.code === 'ECONNREFUSED' ||
          before?.error === why
        ) {
          stopped = why
        }
      }
    }
    /* A failure that stopped every request is said once, for the run. */
    say({
      answers,
      op: 'triaged',
      stopped: answers.every((one) => one.error === stopped) ? stopped : null,
    })
  },

  /* Polls until anything answers, a refusal of the connection being the one
     thing that means nothing is listening yet. */
  async wait({ seconds, url }) {
    const deadline = Date.now() + seconds * 1000
    for (;;) {
      try {
        await within(5, fetch(url, { redirect: 'manual' }), url)
        say({ op: 'waited', up: true })
        return
      } catch {
        if (Date.now() > deadline) {
          say({ op: 'waited', up: false })
          return
        }
        await new Promise((done) => setTimeout(done, 500))
      }
    }
  },
}

/**
 * Playwright, or a failure that says how to install it.
 *
 * **An optional peer of `@fusion.dev/helix-cli`**, because a project that only
 * scans or derives a theme never pictures a page and should not install a
 * browser to do it. The first `helix visual test` is where it is needed, so
 * that is where the instruction is.
 */
const playwright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !String(error.message).includes("'playwright'")) {
      throw error
    }
    throw new Error(
      '`helix visual` pictures pages with Playwright, which is not installed. Install it with `npm install --save-dev playwright`, then its browser with `npx playwright install chromium`.',
    )
  }
}

/**
 * The Anthropic SDK, or a failure that says how to install it: an optional
 * peer for the same reason Playwright is, needed only by a config that asks
 * for a triage.
 */
const anthropic = async () => {
  try {
    return (await import('@anthropic-ai/sdk')).default
  } catch (error) {
    if (
      error?.code !== 'ERR_MODULE_NOT_FOUND' ||
      !String(error.message).includes("'@anthropic-ai/sdk'")
    ) {
      throw error
    }
    throw new Error(
      'the config asks for a triage by Claude, through the Anthropic SDK, which is not installed. Install it with `npm install --save-dev @anthropic-ai/sdk`.',
    )
  }
}

/** The answer every triage request is held to. */
const VERDICT = {
  additionalProperties: false,
  properties: {
    explanation: { type: 'string' },
    verdict: { enum: ['intended', 'unintended', 'unclear'], type: 'string' },
  },
  required: ['verdict', 'explanation'],
  type: 'object',
}

/**
 * One group asked of Claude: the words and any pictures, answered as JSON
 * held to `VERDICT`. A request a safety classifier declines goes to the
 * fallback model Anthropic routes it to, and one declined there too is an
 * answer of its own, not a failure of the run.
 */
const askClaude = async (client, { model, system }, { images, text }) => {
  const response = await client.beta.messages.create({
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    max_tokens: 16000,
    messages: [
      {
        content: [
          ...images.map((data) => ({
            source: { data, media_type: 'image/png', type: 'base64' },
            type: 'image',
          })),
          { text, type: 'text' },
        ],
        role: 'user',
      },
    ],
    model,
    output_config: { effort: 'medium', format: { schema: VERDICT, type: 'json_schema' } },
    system,
  })
  const usage = response.usage ?? {}
  const input =
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  const output = usage.output_tokens ?? 0
  if (response.stop_reason === 'refusal') {
    return { error: 'the model declined to answer', input, output }
  }
  const words = response.content.find((block) => block.type === 'text')?.text ?? ''
  return { ...JSON.parse(words), input, output }
}

/**
 * One group asked of a model on an Ollama endpoint, with the same answer
 * asked for through its `format`.
 */
const askOllama = async ({ model, system, url }, { images, text }) => {
  const answer = await fetch(`${(url ?? 'http://127.0.0.1:11434').replace(/\/+$/, '')}/api/chat`, {
    body: JSON.stringify({
      format: VERDICT,
      messages: [
        { content: system, role: 'system' },
        { content: text, images, role: 'user' },
      ],
      model,
      stream: false,
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  if (!answer.ok) {
    throw new Error(
      `the endpoint answered ${answer.status}: ${(await answer.text()).slice(0, 200)}`,
    )
  }
  const body = await answer.json()
  return {
    ...JSON.parse(body.message?.content ?? '{}'),
    input: body.prompt_eval_count ?? 0,
    output: body.eval_count ?? 0,
  }
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
