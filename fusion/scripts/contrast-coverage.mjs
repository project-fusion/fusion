#!/usr/bin/env node
/**
 * Which pairs the surface model declares that no example paints.
 *
 * **Contrast is measured in the visual shards now**, by `checks.contrast` in
 * `visual.config.ts`, on the page each example is pictured on, and every run
 * record lists each ink and ground pair it measured, under `painted`. This
 * turns those hexes back into tokens and names the modeled pairs that appear
 * in no example, so nothing measures them: a gap in the examples, not a defect
 * in the palette, which the engine measures regardless.
 *
 * **A question for the whole corpus**, so it reads the record of a run that
 * pictured every example, `.helix/visual/run.json` after
 * `bun run check:spec:visual`, or the records of every shard of one run, given
 * as paths. Reported and never failed.
 *
 * The palette is read in the sandbox frame, once per mode, by painting each
 * token and reading the pixel back, the same arithmetic the measurement uses,
 * so a measured hex and a token's hex are the same number. Run after
 * `turbo run frame`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { modelFile } from '@fusion.dev/scripts/models'
import { pairs } from '@fusion.dev/scripts/theme-facts'
import { root } from '@fusion.dev/scripts/workspace'
import { chromium } from 'playwright'

const frame = join(root, 'fusion/site/public/sandbox')

/** Every `run.json` at or under each path. */
const records = (paths) => {
  const found = []
  const walk = (path) => {
    if (!existsSync(path)) {
      return
    }
    if (statSync(path).isFile()) {
      found.push(path)
      return
    }
    for (const name of readdirSync(path)) {
      const next = join(path, name)
      if (statSync(next).isDirectory()) {
        walk(next)
      } else if (name === 'run.json') {
        found.push(next)
      }
    }
  }
  for (const path of paths) {
    walk(path)
  }
  return found
}

const given = process.argv.slice(2)
const files = records(given.length > 0 ? given : [join(root, '.helix/visual/run.json')])
const measured = new Set()
for (const file of files) {
  const record = JSON.parse(readFileSync(file, 'utf8'))
  for (const list of Object.values(record.painted ?? {})) {
    for (const pair of list) {
      measured.add(pair)
    }
  }
}
if (measured.size === 0) {
  console.log(
    'contrast coverage: no run record holds a measured pair. Run `bun run check:spec:visual` first, or name the records of every shard of one run.',
  )
  process.exit(0)
}

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }
const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  const model = modelFile(path)
  if (model) {
    response.writeHead(200, { 'content-type': model.type })
    response.end(model.body)
    return
  }
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

/** Every name the model gives a color, an ink or a ground. */
const named = [...new Set([...pairs].flatMap((pair) => pair.split(' on ')))]

/* Lightning CSS rewrites `light-dark()` into a shim keyed on the attribute, so
   the scheme property alone moves half the palette and leaves the rest. */
const scheme = (mode) => {
  document.documentElement.dataset.colorMode = mode
  document.documentElement.style.colorScheme = mode
}

/* One paint per token, read back through a canvas, the way the measurement
   reads every ink: hex to the names that resolve to it.

   **A ground laid over another, `color-well over color-surface`, is read as
   the measurement reads a field**: the top token through the canvas with its
   alpha, laid over the opaque one under it, so its hex is the one a run
   records. */
const tokens = (names) => {
  const swatch = document.createElement('canvas')
  swatch.width = 1
  swatch.height = 1
  const brush = swatch.getContext('2d', { willReadFrequently: true })
  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  document.body.append(probe)
  const read = (name) => {
    probe.style.color = `var(--helix-${name})`
    brush.fillStyle = '#010203'
    brush.fillStyle = getComputedStyle(probe).color
    brush.clearRect(0, 0, 1, 1)
    brush.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = brush.getImageData(0, 0, 1, 1).data
    return { a: a / 255, b, g, r }
  }
  const found = {}
  for (const name of names) {
    const [top, under] = name.split(' over ').map(read)
    const color = under
      ? Object.fromEntries(
          ['r', 'g', 'b'].map((at) => [at, top[at] * top.a + under[at] * (1 - top.a)]),
        )
      : top
    const hex = `#${['r', 'g', 'b'].map((at) => Math.round(color[at]).toString(16).padStart(2, '0')).join('')}`
    found[hex] = [...(found[hex] ?? []), name]
  }
  probe.remove()
  return found
}

const browser = await chromium.launch()
const tab = await browser.newPage()
await tab.goto(`${origin}/frame.html`, { waitUntil: 'load' })
const palettes = {}
for (const mode of ['light', 'dark']) {
  await tab.evaluate(scheme, mode)
  palettes[mode] = await tab.evaluate(tokens, named)
}
await browser.close()
server.close()

/* A color can belong to more than one token, so every combination counts as
   having been seen: this is a coverage report and not a guarantee. */
const painted = new Set()
for (const pair of measured) {
  const [mode, ink, , ground] = pair.split(' ')
  for (const one of palettes[mode]?.[ink] ?? []) {
    for (const other of palettes[mode]?.[ground] ?? []) {
      painted.add(`${one} on ${other}`)
    }
  }
}

const unpainted = [...pairs].filter((pair) => !painted.has(pair)).sort()
console.log(
  `contrast coverage: ${measured.size} measured pairs across ${files.length} ${files.length === 1 ? 'record' : 'records'}. ` +
    `${pairs.size - unpainted.length} of ${pairs.size} modeled pairs appear in an example.`,
)
if (unpainted.length > 0) {
  console.log(`No example paints ${unpainted.length}, so nothing here measures them:`)
  for (const pair of unpainted) {
    console.log(`  ${pair}`)
  }
}
