#!/usr/bin/env bun
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
/**
 * Finds out what a spec family is doing when it stops coming back.
 *
 * `specs:browser` gives up on a family that blocks the page for sixty seconds
 * and reports it as one failure, which keeps the suite usable and says nothing
 * about the cause. This says the cause.
 *
 * ```
 * bun run probe:stuck virtual-list
 * bun run probe:stuck table 30
 * ```
 *
 * Three things it does that the runner does not:
 *
 * **It builds the family unminified**, so a stack names `measure` and `updated`
 * rather than `t5` and `_$AE`.
 *
 * **It announces each test before running it**, so a run that never returns
 * still says how far it got. The harness is patched at build time rather than
 * edited, because this is a debugging aid and the harness is shipped test
 * infrastructure.
 *
 * **And it interrupts with `Debugger.pause` rather than sampling.** That is the
 * part worth knowing. A CPU profile has to be fetched with `Profiler.stop`,
 * which the renderer answers on the very thread that is pegged, so it never
 * comes back: measured on `virtual-list`, eight and a half minutes of CPU and
 * no profile at all. `Debugger.pause` interrupts running JavaScript, which is
 * exactly the case, and the `Debugger.paused` event carries the call frames.
 *
 * For the same reason `console.log` is not an instrument here: a pegged
 * renderer never flushes console events either, so anything logged inside the
 * loop is queued behind the loop producing it. Pass `--watch <expression>` to
 * have it evaluated *through the paused frame*, which is the one moment the
 * thread is stopped and will answer. The expression is evaluated in the page,
 * so a `globalThis` the code under test writes to is the way to carry values
 * out:
 *
 * ```
 * bun run probe:stuck virtual-list 15 --watch 'globalThis.__mine.slice(-8).join("\n")'
 * ```
 *
 * Written for row 174, where it found that `VirtualizeController` was measuring
 * a box whose height its own render decided, and oscillating between two
 * windows forever.
 */
import { createServer } from 'node:http'
import { extname, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../..')
const harness = join(root, 'helix/testing/src/browser.ts')
const scratch = join(root, '.local/stuck-probe')
const out = join(scratch, 'out')

const args = process.argv.slice(2)
const family = args[0]
const seconds = Number(args.find((one, at) => at > 0 && /^\d+$/.test(one)) ?? 20)
const watch = args.includes('--watch') ? args[args.indexOf('--watch') + 1] : undefined

if (family === undefined || family.startsWith('--')) {
  console.error(
    'probe:stuck: needs a family name.\n\n' +
      '  bun run probe:stuck virtual-list [seconds] [--watch <expression>]\n',
  )
  process.exit(1)
}

/** Every DOM spec that family has, on either tier. */
const SOURCES = [join(root, 'helix/headless/src'), join(root, 'helix/styled/src')]
const specs = []
for (const source of SOURCES) {
  const folder = join(source, family)
  const parts = await readdir(folder, { withFileTypes: true }).catch(() => [])
  for (const part of parts) {
    if (!part.isDirectory()) {
      continue
    }
    for (const file of await readdir(join(folder, part.name))) {
      if (file.endsWith('.dom.spec.ts')) {
        specs.push(join(folder, part.name, file))
      }
    }
  }
}
if (specs.length === 0) {
  console.error(`probe:stuck: no DOM specs for \`${family}\`. Check the name.`)
  process.exit(1)
}

await rm(out, { force: true, recursive: true })
await mkdir(out, { recursive: true })
const entry = join(scratch, `${family}.ts`)
await writeFile(
  entry,
  "import 'lit/directives/unsafe-html.js'\nimport 'lit/directives/unsafe-svg.js'\n" +
    specs.map((one) => `import '${relative(scratch, one).replaceAll('\\', '/')}'`).join('\n') +
    `\nimport { claim } from '${relative(scratch, harness).replaceAll('\\', '/')}'\nexport const run = claim()\n`,
)

const built = await Bun.build({
  entrypoints: [entry],
  minify: false,
  naming: { chunk: '[name]-[hash].[ext]', entry: '[name].[ext]' },
  outdir: out,
  plugins: [
    {
      name: 'browser-spec-harness',
      setup(build) {
        build.onResolve({ filter: /^(bun:test|@helix-io\/testing\/dom)$/ }, () => ({
          path: harness,
        }))
        build.onLoad({ filter: /testing\/src\/browser\.ts$/ }, async (item) => {
          const source = await Bun.file(item.path).text()
          const anchor = '  for (const entry of ownCases) {\n    const started = performance.now()'
          if (!source.includes(anchor)) {
            throw new Error('probe:stuck: the harness no longer has the loop this patches')
          }
          /* biome-ignore lint/suspicious/noTemplateCurlyInString: this string *is*
             a template literal, in the code being generated rather than in this
             file. The rule is right about every other occurrence of the shape. */
          const announce = '    console.log(`>> ${entry.suite.join(" > ")} > ${entry.name}`)'
          return {
            contents: source.replace(
              anchor,
              [
                '  for (const entry of ownCases) {',
                announce,
                '    const started = performance.now()',
              ].join('\n'),
            ),
            loader: 'ts',
          }
        })
      },
    },
  ],
  splitting: false,
  target: 'browser',
})
if (!built.success) {
  for (const log of built.logs) {
    console.error(log)
  }
  process.exit(1)
}
console.log(`probe:stuck: built ${family} from ${specs.length} spec file(s), unminified`)

const base = join(root, 'site/ui/public/sandbox/frame.css')
const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }
const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  if (path === '/') {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(
      '<!doctype html><meta charset="utf-8"><title>specs</title>' +
        '<link rel="stylesheet" href="/frame.css">',
    )
    return
  }
  try {
    const body = await readFile(path === '/frame.css' ? base : join(out, path.replace(/^\/+/, '')))
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'text/plain' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (message) => console.log(`  ${message.text()}`))
page.on('pageerror', (error) => console.log(`  page error: ${String(error).split('\n')[0]}`))
await page.goto(origin, { waitUntil: 'load' })

const cdp = await page.context().newCDPSession(page)
await cdp.send('Debugger.enable')
const paused = new Promise((done) => {
  cdp.on('Debugger.paused', (event) => done(event.callFrames ?? []))
})

const running = page
  .evaluate(async (url) => {
    const module = await import(url)
    return await module.run()
  }, `${origin}/${family}.js`)
  .catch((error) => `THREW: ${String(error).split('\n')[0]}`)

const outcome = await Promise.race([
  running,
  new Promise((done) => setTimeout(() => done('STUCK'), seconds * 1000)),
])

let frames = []
let watched = ''
if (outcome === 'STUCK') {
  await cdp.send('Debugger.pause')
  frames = await Promise.race([paused, new Promise((done) => setTimeout(() => done([]), 10_000))])
  if (watch !== undefined && frames[0]) {
    const answer = await cdp
      .send('Debugger.evaluateOnCallFrame', {
        callFrameId: frames[0].callFrameId,
        expression: watch,
        returnByValue: true,
      })
      .catch((error) => ({ result: { value: `could not read: ${String(error).split('\n')[0]}` } }))
    watched = String(answer.result?.value ?? '')
  }
}

await browser.close()
server.close()

if (outcome !== 'STUCK') {
  if (typeof outcome === 'string') {
    console.log(`\n${outcome}`)
    process.exitCode = 1
  } else {
    const failed = outcome.filter((one) => !one.passed)
    console.log(`\nit came back: ${outcome.length - failed.length} passed, ${failed.length} failed`)
    for (const one of failed) {
      console.log(`  FAIL  ${one.name}\n    ${one.error ?? 'failed'}`)
    }
  }
  process.exit(process.exitCode ?? 0)
}

console.log(`\nprobe:stuck: still running after ${seconds}s. Interrupted it, and this is where:\n`)
if (frames.length === 0) {
  console.log('  the pause did not land, which means it is not in JavaScript at all')
}
for (const frame of frames.slice(0, 24)) {
  const at = frame.location
  console.log(
    `  ${frame.functionName || '(anonymous)'}  ` +
      `${(frame.url || '(no url)').replace(origin, '')}:${(at?.lineNumber ?? 0) + 1}`,
  )
}
if (watched) {
  console.log(`\nwhat --watch returned:\n${watched}`)
}
process.exitCode = 1
