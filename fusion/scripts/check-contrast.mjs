#!/usr/bin/env node
/**
 * Measures every ink against the ground it is really painted on.
 *
 * **This is the two thirds the `pairings` rule cannot see.** That one reads the
 * stylesheets and can only recognize a rule that sets an ink *and* a ground
 * together: eleven do, where 165 set only an ink and 112 only a ground, and the
 * rest inherit their ground from a host, a part above them or the page. No scan
 * of the text resolves that. Laying the page out does.
 *
 * So this renders every example in the sandbox frame, the same way
 * `run-example-smoke.mjs` does and for the same reason, and walks what the
 * browser drew.
 *
 * **The instrument is the hard part, and #124 recorded three ways it lies.**
 * Each one reported a component as broken when the probe was what was wrong.
 *
 * - **A transparent background paints nothing.** `rgba(0, 0, 0, 0)` composited
 *   into a canvas leaves whatever was there, so a naive read gives the last
 *   opaque thing measured rather than this element's ground. The walk goes up
 *   the tree collecting every partly-opaque layer and composites them in order
 *   onto the first fully opaque one it finds.
 * - **A reading taken during a transition is the previous value.** Color
 *   changes here run 120ms, so a measurement taken while one is in flight
 *   reports the mode the page was in a moment ago. Nothing is read until the
 *   frame has settled.
 * - **A mode scoped to a wrapper is not the mode of the page behind it.** The
 *   composite has to stop at a real opaque ground rather than assuming the
 *   document's, which is what the walk up does.
 *
 * **A `::backdrop` is not walked, and a modal's scrim is one.** A drawer's wash
 * over the page is painted by a pseudo-element, which has no node to composite,
 * so a glass panel is measured over the page rather than over the scrimmed page.
 * The scrim moves the ground toward the middle, so the figure this reports for a
 * modal surface is the one before that: near enough on the panels here, and
 * wrong in the optimistic direction, which is worth knowing before it is
 * trusted on a translucent surface over a heavy scrim.
 *
 * **Shadow boundaries are crossed on purpose**: the ink of a part inside a
 * component is exactly the reading that matters, and stopping at the host would
 * measure only what consumers wrote.
 *
 * **Only elements that paint text are read.** An empty box has no ink to judge,
 * and every wrapper in the tree would otherwise arrive as a pair.
 *
 * Run with `bun run check:css:contrast`, after `turbo run frame`.
 * `--shard <i> --of <n>` measures one of `n` shares of the families, as
 * `@fusion.dev/scripts/shard` splits them for CI.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { costOf } from '@fusion.dev/scripts/cost'
import { offline, pool } from '@fusion.dev/scripts/pool'
import { owner, shard, which } from '@fusion.dev/scripts/shard'
import { pairs } from '@fusion.dev/scripts/theme-facts'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'
import { chromium } from 'playwright'

const frame = join(root, 'fusion/site/public/sandbox')
const source = join(root, SOURCE.styled)

/** WCAG 2.1 AA: body text, and what the European Accessibility Act points at. */
const TARGET = 4.5

/** Large text under 1.4.3, which answers to 3:1 instead. */
const LARGE_PX = 24
const LARGE_BOLD_PX = 18.66
const COMPONENT_TARGET = 3

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }

const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  try {
    const body = readFileSync(join(frame, path.replace(/^\/+/, '') || 'frame.html'))
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'text/plain' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

/* `pairs` is every pair the surface model declares, so the run can say which of
   them no example ever put on screen.

   **This check reads what the examples render, and that was an invisible gap
   rather than a stated one.** A pair nothing paints is not measured and not
   reported, which is how `--helix-color-primary` sat at 4.431:1 against
   `surface-raised` in dark until the engine was asked instead. Naming the
   unpainted pairs turns the hole into a list.

   **Read from what the engine emitted, not from its source.** The model is
   Rust, and a regular expression standing in for it misses every status ink's
   grounds. `helix component`'s `pairings` carries the argument. */

/** Every token the model names, which the page resolves to a color per mode. */
const named = [...new Set([...pairs].flatMap((pair) => pair.split(' on ')))]

const every = []
for (const family of readdirSync(source)) {
  let entries = []
  try {
    entries = readdirSync(join(source, family, '.examples'))
  } catch {
    continue
  }
  for (const file of entries.filter((entry) => entry.endsWith('.html'))) {
    const slug = file.replace(/\.html$/, '')
    let styles = ''
    try {
      styles = readFileSync(join(source, family, '.examples', `${slug}.css`), 'utf8')
    } catch {
      styles = ''
    }
    every.push({
      html: readFileSync(join(source, family, '.examples', file), 'utf8'),
      name: `${family}/${slug}`,
      styles,
    })
  }
}

/* **This run's families, when CI splits the check**, weighed by what each was
   measured to cost rather than by how many examples it holds:
   `@fusion.dev/scripts/cost` argues that and `@fusion.dev/scripts/shard` the
   split. A shard with none passes before the browser starts, and says so in
   words. */
const familyOf = (one) => one.name.split('/')[0]
const asked = shard()
const ours = owner(
  every.map(familyOf),
  costOf('contrast', (family) => every.filter((one) => familyOf(one) === family).length),
  asked,
)
const examples = every.filter((one) => ours(familyOf(one)))
if (examples.length === 0) {
  console.log(
    `contrast: ${which(asked)} holds none of the families, which the other shards measure.`,
  )
  process.exit(0)
}

/**
 * Renders one example into the frame, waits for it to stop changing, and reads
 * every ink on it. Evaluated in the page, so it carries everything it uses.
 */
const read = async ({ html, styles, target, large, largeBold, component }) => {
  /* **Every node, shadow roots included**, because the boxes a component
     places for itself are inside one, and a walk of the light tree alone would
     call a page still while they moved. */
  const everything = () => {
    const found = []
    const visit = (root) => {
      for (const element of root.querySelectorAll('*')) {
        found.push(element)
        if (element.shadowRoot) {
          visit(element.shadowRoot)
        }
      }
    }
    visit(document)
    return found
  }

  /* From the top, and before the markup goes in. The walk below scrolls to
     text below the fold, so without this an example would open wherever the
     one before it left the page, and read differently for having followed it. */
  window.scrollTo(0, 0)

  /* The frame's own listener was added before this one, so hearing the message
     here means the markup is in and its scripts are on their way. */
  await new Promise((done) => {
    const heard = (event) => {
      if (event.data?.type === 'helix-preview-render') {
        window.removeEventListener('message', heard)
        done()
      }
    }
    window.addEventListener('message', heard)
    window.postMessage(
      { layout: 'padded', source: html, styles, type: 'helix-preview-render' },
      '*',
    )
  })

  /* **Then until nothing is left to arrive, and the page has held still for
     three frames.** Each signal is the one its source publishes rather than a
     count of frames, because a count is a race a busier page loses: two frames
     read `data-table/preview` at 16 inks or 1 and `object-inspector/windowed`
     at 99 or 1. The definitions, the fonts, every Helix element's `whenSettled`
     and its update, every picture's and every clip's load or failure, which is
     when an avatar draws its fallback and a video its error (`video/start-control`
     read an ink more or fewer by whether that had landed), and every transition
     that will end: #124 measured a component at 2.58 in the middle of one, and
     it was the previous mode.

     Asked again on every pass, because each can start the next: a font that
     lands moves a box, and a box that moves can set a transition going. Held
     still by layout offsets rather than by rectangles, so a spinner turning in
     place is still and a box that moved is not. Bounded as a whole, so an
     example that never stops is read as it stands after five seconds rather than
     hanging the sweep; the longest any example took, measured 15 Sep 2026, was
     under one. */
  const deadline = performance.now() + 5000
  const within = (promise) =>
    Promise.race([
      promise,
      new Promise((done) => setTimeout(done, Math.max(0, deadline - performance.now()))),
    ])
  const shape = () =>
    everything()
      .map(
        (element) =>
          `${element.offsetLeft},${element.offsetTop},${element.offsetWidth},${element.offsetHeight},${element.scrollLeft},${element.scrollTop}`,
      )
      .join('|')
  let last = ''
  for (let still = 0; still < 3 && performance.now() < deadline; ) {
    const nodes = everything()
    await within(
      Promise.all(
        [...new Set(nodes.filter((one) => !one.matches(':defined')).map((one) => one.localName))]
          .filter((tag) => tag.startsWith('helix-'))
          .map((tag) => customElements.whenDefined(tag)),
      ),
    )
    await within(document.fonts.ready)
    await within(
      Promise.all(
        nodes.flatMap((one) =>
          [one.whenSettled, one.updateComplete].filter((signal) => signal instanceof Promise),
        ),
      ),
    )
    await within(
      Promise.all(
        nodes
          .filter((one) =>
            one instanceof HTMLImageElement
              ? !one.complete
              : one instanceof HTMLMediaElement &&
                one.networkState === HTMLMediaElement.NETWORK_LOADING &&
                one.readyState < HTMLMediaElement.HAVE_METADATA,
          )
          .map(
            (media) =>
              new Promise((done) => {
                for (const heard of ['load', 'loadedmetadata', 'error']) {
                  media.addEventListener(heard, done, { capture: true, once: true })
                }
              }),
          ),
      ),
    )
    await within(
      Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === 'running' &&
              animation.timeline === document.timeline &&
              animation.effect?.getComputedTiming().endTime !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      ),
    )
    await new Promise((done) => requestAnimationFrame(done))
    const now = shape()
    still = now === last ? still + 1 : 0
    last = now
  }

  /* **Read through a canvas, not a regexp.** `getComputedStyle` hands back
   whatever notation the value was authored in. This palette is written in
   OKLCH and Chrome returns `oklch(0.62 0.206 259.678)` verbatim, so a
   pattern looking for `rgb()` matches almost nothing and skips the ink
   without saying so. The first run of this reported eight measurements
   across 509 examples and called it a pass.

   `tokens.css` records the same rule from the other side: painting the
   color and reading the pixel back is the only way to get sRGB out of
   these. Reading the three numbers inside an `oklch()` as if they were RGB
   produces figures that mean nothing. */
  const swatch = document.createElement('canvas')
  swatch.width = 1
  swatch.height = 1
  const brush = swatch.getContext('2d', { willReadFrequently: true })

  const parse = (value) => {
    if (!value || value === 'transparent' || value === 'none') {
      return null
    }
    /* A value the browser refuses leaves `fillStyle` at what it held, so a
     color it could not read would otherwise arrive as this sentinel. */
    brush.fillStyle = '#010203'
    brush.fillStyle = value
    if (brush.fillStyle === '#010203' && !/^#010203$/i.test(value.trim())) {
      return null
    }
    brush.clearRect(0, 0, 1, 1)
    brush.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = brush.getImageData(0, 0, 1, 1).data
    return { a: a / 255, b, g, r }
  }

  /* Composite one partly-opaque layer over what is already behind it. */
  const over = (top, bottom) => ({
    a: 1,
    b: top.b * top.a + bottom.b * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    r: top.r * top.a + bottom.r * (1 - top.a),
  })

  const luminance = ({ b, g, r }) => {
    const lin = (value) => {
      const c = value / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }

  const ratio = (ink, ground) => {
    const a = luminance(ink)
    const b = luminance(ground)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }

  /* **Up the flat tree, not the DOM tree.** Slotted content is painted where
   the slot sits, so a button passed into a toast is drawn inside the toast's
   shadow part and takes that part's surface as its ground. Following
   `parentElement` walks host to host instead, misses every surface a
   component paints around what it was given, and lands on the page: that
   read the toast's action as white on white and called it 1:1. */
  const up = (node) => {
    if (node.assignedSlot) {
      return node.assignedSlot
    }
    if (node.parentElement) {
      return node.parentElement
    }
    const above = node.getRootNode()
    return above instanceof ShadowRoot ? above.host : null
  }

  /* **An element that paints its own pixels is an unbounded ground**, which
   is the same call `model.ts` makes for `color-surface-media` and
   `color-overlay`: what is behind the text is a video frame or a photograph,
   and no contrast figure against it means anything. Only media that covers
   the text counts, so an avatar elsewhere on the page does not silence a
   real reading. */
  const MEDIA = 'video, img, canvas, iframe, object, svg image'
  const unbounded = (node, box) => {
    if (getComputedStyle(node).backgroundImage !== 'none') {
      return true
    }
    for (const painted of node.querySelectorAll?.(MEDIA) ?? []) {
      const area = painted.getBoundingClientRect()
      if (
        area.left <= box.left &&
        area.top <= box.top &&
        area.right >= box.right &&
        area.bottom >= box.bottom
      ) {
        return true
      }
    }
    return false
  }

  /* Up the flat tree collecting every layer that is not fully transparent,
   until one is fully opaque. Returns the layers and the node the walk
   stopped on, because the caller has to check that ancestry was entitled to
   answer at all. */
  const groundOf = (element, box) => {
    const stack = []
    let node = element
    while (node) {
      const style = getComputedStyle(node)
      /* **A masked background is ink in the shape of a glyph, not a ground.**
       Date Input draws its calendar with `background-color: currentColor` under a
       `mask-image`, so the color lands only where the mask allows and the element
       covers nothing. Composited as a ground it made the icon its own backdrop and
       read 1:1. */
      const masked = style.maskImage !== 'none' && style.maskImage !== ''
      const paint = masked ? null : parse(style.backgroundColor)
      /* **A modal's scrim is a `::backdrop` and has no node**, so a walk
       that steps past it measures a glass drawer over the page rather than
       over the scrimmed page, wrong in the optimistic direction, since
       the scrim pulls the ground toward the middle and a translucent panel
       carries that through to its own inks.
       `getComputedStyle` reads a pseudo-element by name, and an element
       not in the top layer answers with the initial transparent, so this
       costs one read and needs no test for modality.

       Behind the element's own paint and in front of everything above it,
       which is where the top layer puts it. */
      const layers = [paint, parse(getComputedStyle(node, '::backdrop').backgroundColor)]
      for (const layer of layers) {
        if (!layer || layer.a === 0) {
          continue
        }
        stack.push(layer)
        if (layer.a === 1) {
          let composited = stack.pop()
          while (stack.length > 0) {
            composited = over(stack.pop(), composited)
          }
          return { color: composited, on: node }
        }
      }
      if (unbounded(node, box)) {
        return null
      }
      node = up(node)
    }
    return null
  }

  /* **What is behind a thing is not always above it in the tree.** A sticky
   bar drawn over a hero it is a sibling of takes its ground from that hero,
   and ancestry walks straight past to the page: that read a wordmark over a
   dark band as white on white and called it 1:1.

   Paint order is what settles it, so the stack at the text's own center is
   read independently, piercing shadow roots the same way. Where the two
   agree the reading stands. Where a painter that is not an ancestor lies
   between the text and its ground, nothing is claimed: the color behind a
   transparent bar belongs to whoever put the bar there, which is
   `model.ts`'s unbounded ground arriving by another route. */
  /* A shadow root's own `elementsFromPoint` reports the outer stack
   retargeted into that tree, so the host comes back inside its own shadow
   and the descent never ends. Each element is entered once. */
  const stackAt = (x, y, root = document, seen = new Set()) => {
    const layers = []
    for (const element of root.elementsFromPoint(x, y)) {
      if (seen.has(element)) {
        continue
      }
      seen.add(element)
      if (element.shadowRoot) {
        layers.push(...stackAt(x, y, element.shadowRoot, seen))
      }
      layers.push(element)
    }
    return layers
  }

  const contested = (element, ground, box) => {
    const stack = stackAt(box.left + box.width / 2, box.top + box.height / 2)
    const seen = stack.indexOf(element)
    const floor = stack.indexOf(ground.on)
    /* The point stack could not place one of them, so it has nothing to
     say and ancestry keeps the answer. */
    if (seen < 0 || floor < 0) {
      return false
    }
    const line = new Set()
    for (let node = element; node; node = up(node)) {
      line.add(node)
    }
    for (const between of stack.slice(seen + 1, floor)) {
      const paint = parse(getComputedStyle(between).backgroundColor)
      if (!line.has(between) && paint && paint.a > 0) {
        return true
      }
    }
    return false
  }

  /* **An icon is ink too, and nothing was reading it.** A trigger whose only
 content is a glyph has no text node, so a walk looking for text steps
 over it: the Speed Dial pair `pairings` caught at 2.96:1 was
 reintroduced here deliberately and this check passed it.

 A glyph is a graphic, so the bar is 1.4.11's 3:1 rather than 1.4.3's 4.5.

 Only a drawing that resolves to a single paint is read. An icon is one
 color by construction, inherited through `currentColor`; a chart is not,
 and the root `<svg>` of one carries a paint its bars all override, so
 measuring it would report a color that is nowhere on screen. Where the
 drawing has more than one, this says so rather than guessing. */
  /* Read off the live palette rather than written down here, so a theme that
   moves its rules moves this with them. */
  const probe = document.createElement('span')
  probe.style.color = 'var(--helix-color-border)'
  probe.style.position = 'absolute'
  document.body.append(probe)
  const rule = getComputedStyle(probe).color
  probe.remove()

  const iconInk = (element) => {
    const paints = new Set()
    for (const node of [element, ...element.querySelectorAll('*')]) {
      const style = getComputedStyle(node)
      for (const paint of [style.fill, style.stroke]) {
        if (paint && paint !== 'none') {
          paints.add(paint)
        }
      }
    }
    if (paints.size !== 1) {
      return null
    }
    /* **A rule is not an ink, and the palette is the one that says so.** Rating's
     empty star and Steps' unreached mark are both drawn in `color-border`, the
     token for a line that separates rather than a mark that informs, and 1.4.11
     asks its 3:1 of graphics required to understand the content. Holding a
     deliberately faint boundary to the bar meant for a glyph reports ten
     components as broken for agreeing with the palette. */
    const [only] = [...paints]
    if (only === rule) {
      return null
    }
    return parse(only)
  }

  const host = document.getElementById('preview-root')

  /* **A slotted label is painted by the box it lands in, not by the element
   it is written inside**, and asking the wrong one of the two is the
   difference between a number and a number that looks like one.

   `<helix-button>Save</helix-button>` holds the text node, so the walk
   below finds it on the host and reads the host's ink and the ground above
   the host. The glyphs are drawn inside the button's shadow root, in that
   box's `color` and on that box's fill. Measured on `emphasis="subtle"
   tone="primary"`: the host answers `oklch(0 0 0)` on `#ffffff`, 21:1,
   while the pixels on screen are `#1068da` on `#ddeafa`, 4.29:1. Under AA
   and reported as clear.

   The shadow box was not covering for it either: it holds a `<slot>` and
   no text node of its own, so the guard below skipped it outright. So
   every component whose label arrives through a slot had its label
   measured against an ink nothing paints and a ground nothing sits on,
   which is most of the library.

   The walk up is a loop because a slot can be assigned to another slot:
   a button inside a toolbar inside a header reaches its painter through
   as many hops as there are shadow roots between them. */
  const painterOf = (element) => {
    let node = [...element.childNodes].find(
      (child) => child.nodeType === 3 && child.textContent.trim().length > 0 && child.assignedSlot,
    )
    if (!node) {
      return element
    }
    while (node.assignedSlot) {
      node = node.assignedSlot
    }
    return node.parentElement ?? element
  }

  const walk = (node, out) => {
    for (const element of node.querySelectorAll('*')) {
      if (element.shadowRoot) {
        walk(element.shadowRoot, out)
      }
      const text = [...element.childNodes].some(
        (child) => child.nodeType === 3 && child.textContent.trim().length > 0,
      )
      if (!text && !(element instanceof SVGSVGElement)) {
        continue
      }
      let box = element.getBoundingClientRect()
      /* **A hairline box is a label for a screen reader, not text on a
         page.** The `clip-path: inset(50%)` pattern leaves a one pixel
         square wherever it is used, and Radio's chip variant puts the name
         of every choice in one: the words name the chip without taking
         room in it. Nobody sees those glyphs, so the ratio they would
         score is a number about nothing, and it is not a flattering one
         either. Measured on `radio/chips`, the hidden label read 1.12:1
         against the chip it is absolutely positioned inside.

         One pixel rather than zero, because zero is the box that was never
         laid out and one is the box that was laid out to be unreadable.
         Neither is text anybody is asked to read.

         Asked of the painter as well as of this element, and the painter is
         the one that answers: `clip-path` and `overflow` are paint, not
         layout, so a full sized word slotted into a one pixel box still
         reports a full sized rectangle of its own. The box that was shrunk
         is the one holding it. */
      if (box.width <= 1 || box.height <= 1) {
        continue
      }
      /* Geometry from the element, because that is where the glyphs are.
         Everything about how they are painted from whatever paints them:
         the ink, the ground under it, and the size and weight that decide
         which target it answers to all belong to the box the text is
         rendered in. */
      const painter = text ? painterOf(element) : element
      if (painter !== element) {
        const paints = painter.getBoundingClientRect()
        if (paints.width <= 1 || paints.height <= 1) {
          continue
        }
      }
      const style = getComputedStyle(painter)
      if (style.visibility === 'hidden' || style.opacity === '0') {
        continue
      }
      const ink = text ? parse(style.color) : iconInk(element)
      if (!ink) {
        continue
      }
      /* **Scrolled to, not skipped.** Paint order can only be read where
       the browser is looking, and on a tall example most of the text is
       not: skipping it left 7830 inks unmeasured against 5453 read, so
       the majority of the page was going unexamined by a check whose
       whole claim is that it covers what the stylesheets cannot. */
      if (box.top < 0 || box.bottom > window.innerHeight) {
        element.scrollIntoView({ block: 'center' })
        box = element.getBoundingClientRect()
      }
      if (box.top < 0 || box.bottom > window.innerHeight) {
        out.offscreen += 1
        continue
      }
      const ground = groundOf(painter, box)
      if (!ground || contested(painter, ground, box)) {
        out.unresolved += 1
        continue
      }
      const size = Number.parseFloat(style.fontSize)
      const bold = Number.parseInt(style.fontWeight, 10) >= 700
      const wanted = !text || size >= large || (bold && size >= largeBold) ? component : target
      const flat = ink.a === 1 ? ink : over(ink, ground.color)
      const hex = ({ b, g, r }) =>
        `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
      out.pairs.push(`${hex(flat)}|${hex(ground.color)}`)
      const measuredRatio = ratio(flat, ground.color)
      out.measured += 1
      if (measuredRatio < wanted) {
        out.failures.push({
          ground: hex(ground.color),
          ink: hex(flat),
          part: painter.getAttribute('part') ?? painter.tagName.toLowerCase(),
          ratio: Number(measuredRatio.toFixed(2)),
          target: wanted,
          text: (element.textContent ?? '').trim().slice(0, 24),
        })
      }
    }
  }

  const out = { failures: [], measured: 0, offscreen: 0, pairs: [], unresolved: 0 }
  walk(host, out)
  return out
}

const browser = await chromium.launch()

/* Tall, because paint order can only be read inside the viewport and an example
   that scrolls would otherwise arrive as a page of unmeasurable text. */
const CONTEXT = { viewport: { height: 2400, width: 1280 } }

/* Nothing leaves this machine. An avatar or an image pointing at another host
   draws its fallback when the request fails, and a request left open fails on
   the network's schedule rather than at once. */
const closed = offline(origin)

const MODES = ['light', 'dark']

/* Lightning CSS rewrites `light-dark()` into a shim keyed on the attribute, so
   the scheme property alone moves half the palette and leaves the rest. */
const scheme = (mode) => {
  document.documentElement.dataset.colorMode = mode
  document.documentElement.style.colorScheme = mode
}

/* One paint per token, read back through the same canvas the walk uses, so a
   measured hex and a token's hex are the same arithmetic. */
const tokens = (names) => {
  const swatch = document.createElement('canvas')
  swatch.width = 1
  swatch.height = 1
  const brush = swatch.getContext('2d', { willReadFrequently: true })
  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  document.body.append(probe)
  const found = {}
  for (const name of names) {
    probe.style.color = `var(--helix-${name})`
    brush.fillStyle = '#010203'
    brush.fillStyle = getComputedStyle(probe).color
    brush.clearRect(0, 0, 1, 1)
    brush.fillRect(0, 0, 1, 1)
    const [r, g, b] = brush.getImageData(0, 0, 1, 1).data
    const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    found[hex] = [...(found[hex] ?? []), name]
  }
  probe.remove()
  return found
}

const open = async (tab) => {
  await tab.goto(`${origin}/frame.html`, { waitUntil: 'load' })
  return tab
}

/* The palette, once per mode, on a page of its own: it is the frame's and not
   any example's. */
const palettes = {}
{
  const context = await browser.newContext(CONTEXT)
  const tab = await open(await context.newPage())
  for (const mode of MODES) {
    await tab.evaluate(scheme, mode)
    palettes[mode] = await tab.evaluate(tokens, named)
  }
  await context.close()
}

const families = [...Map.groupBy(examples, (one) => one.name.split('/')[0]).values()]

/* **On the pool the other browser checks share, a page per worker**, because a
   reading is now a function of its example alone: what `read` waits for, the
   page put back at the top, and nothing let off the machine. Measured 15 Sep
   2026 on twelve cores, 1134 renders read alike to the ink across three runs on
   four workers, one on ten, one on a fresh page per family and one on one page
   for everything: 8428 inks, 350 on an unbounded ground and 8 below the fold,
   every time. 34 seconds on four workers, 110 on one. Where the one page before
   this read 8413, the ten readings that moved were each an avatar's fallback,
   a picture's or a video's failed request, or three timestamps a chat's script
   sets, landing before the read rather than after it. A page per worker rather
   than per family for `pool`'s reason: nothing a family leaves behind reaches
   the next one's reading, and a runner pays for every page it opens. */
const byFamily = await pool(families, {
  browser,
  context: CONTEXT,
  family: (group) => familyOf(group[0]),
  open,
  page: 'worker',
  prepare: closed,
  run: async (tab, family) => {
    const readings = {}
    for (const mode of MODES) {
      /* **Both modes, because a palette has two halves and only one is on
         screen.** Every reading is of the mode the frame is in, and the pairs
         that fail are rarely the same on each side: the ramp lightens what it
         darkens. The mode is set before the content is injected rather than
         after, so what the example draws does not transition into it. */
      await tab.evaluate(scheme, mode)
      readings[mode] = []
      for (const example of family) {
        readings[mode].push(
          await tab.evaluate(read, {
            component: COMPONENT_TARGET,
            html: example.html,
            large: LARGE_PX,
            largeBold: LARGE_BOLD_PX,
            styles: example.styles,
            target: TARGET,
          }),
        )
      }
    }
    return readings
  },
})

await browser.close()
server.close()

const findings = []
const painted = new Set()
let measured = 0
let offscreen = 0
let unresolved = 0

/* Mode by mode, then family by family, the order one page once read them in, so
   a failing run lists what it found as it always did. */
for (const mode of MODES) {
  for (const [at, family] of families.entries()) {
    for (const [index, example] of family.entries()) {
      const result = byFamily[at][mode][index]
      measured += result.measured
      offscreen += result.offscreen
      unresolved += result.unresolved
      /* A color can belong to more than one token, so every combination counts
         as having been seen: this is a coverage report and not a guarantee. */
      for (const pair of result.pairs) {
        const [ink, ground] = pair.split('|')
        for (const one of palettes[mode][ink] ?? []) {
          for (const other of palettes[mode][ground] ?? []) {
            painted.add(`${one} on ${other}`)
          }
        }
      }
      for (const failure of result.failures) {
        findings.push(
          `${example.name} (${mode}): \`${failure.part}\` is ${failure.ink} on ` +
            `${failure.ground}, ${failure.ratio}:1 against a target of ` +
            `${failure.target}:1. Text: "${failure.text}"`,
        )
      }
    }
  }
}

if (findings.length > 0) {
  const shown = findings.slice(0, 40)
  console.error(`Contrast failures on a rendered page (${findings.length}):\n`)
  for (const finding of shown) {
    console.error(`  ${finding}`)
  }
  if (findings.length > shown.length) {
    console.error(`\n  and ${findings.length - shown.length} more.`)
  }
  console.error('')
  process.exit(1)
}

console.log(
  `contrast: ${measured} inks measured against the ground they are painted on, ` +
    `across ${examples.length} examples in both color modes, every one clearing its target` +
    (asked === undefined ? '' : `, in ${which(asked)}`) +
    (unresolved > 0 ? `. ${unresolved} sit on an unbounded ground and cannot be` : '') +
    (offscreen > 0 ? `, ${offscreen} below the fold` : ''),
)

/* Reported rather than failed. A pair the model declares and no example paints
   is a gap in the examples, not a defect in the palette, and the engine measures
   every one of them regardless. What this adds is knowing which.

   **A question about the whole corpus, so a shard does not answer it.** A pair
   the other shards paint would be listed here as painted by nothing, which is
   the list being wrong in the direction that sends somebody to write an example
   that already exists. A shard says where the answer is instead. */
const unpainted = [...pairs].filter((pair) => !painted.has(pair)).sort()
if (asked !== undefined) {
  console.log(
    `contrast: which of the ${pairs.size} modeled pairs no example paints is a question for the ` +
      'whole corpus, so a shard leaves it to `bun run check:css:contrast`.',
  )
} else if (unpainted.length > 0) {
  console.log(
    `contrast: ${pairs.size - unpainted.length} of ${pairs.size} modeled pairs ` +
      `appear in an example. No example paints ${unpainted.length}, so nothing here ` +
      'measures them:',
  )
  for (const pair of unpainted.slice(0, 12)) {
    console.log(`  ${pair}`)
  }
  if (unpainted.length > 12) {
    console.log(`  and ${unpainted.length - 12} more.`)
  }
}
