#!/usr/bin/env node
/**
 * Renders every example in a real browser and reports anything that broke.
 *
 * `helix component`'s `examples` reads them: it knows an attribute a component does not
 * declare, a slot nothing offers, an inline style. What it cannot know is
 * whether the example *works*, because the only way to find that out is to run
 * it. An example could throw on upgrade, name an element that is registered
 * nowhere, or render an empty box, and the first anyone would hear of it is a
 * reader opening the sandbox.
 *
 * What is checked, per example:
 *
 * - **Nothing throws.** Errors and unhandled rejections from the frame, and any
 *   `console.error` a component wrote on its way past.
 * - **Every `helix-` element upgraded.** An element whose module is missing
 *   from the bundle renders its children inline and looks, in a screenshot,
 *   almost exactly like a component that worked.
 * - **Something was drawn.** An example that lays out to nothing at all is
 *   broken however quiet it is.
 *
 * The real frame, its real bundle, the same `postMessage` the sandbox sends. A
 * second harness that rendered examples its own way would be checking a
 * relationship nobody has.
 *
 * Run with `bun run smoke:examples`, after `turbo run frame`. Families run side
 * by side on the workers `@fusion.dev/scripts/pool` decides, and `--workers 1`
 * takes them one at a time. `--shard <i> --of <n>` takes one of `n` shares of
 * the families, as `@fusion.dev/scripts/shard` splits them for CI.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { costOf } from '@fusion.dev/scripts/cost'
import { modelFile } from '@fusion.dev/scripts/models'
import { pool } from '@fusion.dev/scripts/pool'
import { owner, shard, which } from '@fusion.dev/scripts/shard'
import { root, SOURCE, TAG_PREFIX } from '@fusion.dev/scripts/workspace'
import { chromium } from 'playwright'

const frame = join(root, 'fusion/site/public/sandbox')
const source = join(root, SOURCE.styled)

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }

const server = createServer(async (request, response) => {
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

/** Every example, as the pair of files the sandbox would hand the frame. */
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

if (every.length === 0) {
  console.error('example smoke: no examples found.')
  process.exit(1)
}

/* **This run's families, when CI splits the check**, weighed by what each was
   measured to cost rather than by how many examples it holds:
   `@fusion.dev/scripts/cost` argues that and `@fusion.dev/scripts/shard` the
   split. A shard with none passes before the server and the browser start, and
   says so in words. */
const familyOf = (one) => one.name.split('/')[0]
const asked = shard()
const ours = owner(
  every.map(familyOf),
  costOf('smoke', (family) => every.filter((one) => familyOf(one) === family).length),
  asked,
)
const examples = every.filter((one) => ours(familyOf(one)))
if (examples.length === 0) {
  console.log(
    `example smoke: ${which(asked)} holds none of the families, which the other shards render.`,
  )
  process.exit(0)
}

/* A request that failed is not a component that failed.
 *
 * The browser reports a 404 as a `console.error`, and `avatar/broken-image`
 * exists precisely to point at an image that is not there: its whole subject is
 * what an avatar does when the picture will not load. Counting that would fail
 * the one example whose success looks exactly like this.
 *
 * Matched on the message rather than by watching the network, because what is
 * being excluded is the browser's own report and not the request. Anything a
 * component logs still counts. */
const NETWORK = /Failed to load resource/

/* The controlled-state audit, which is a `warn` rather than an `error` because
   it is aimed at a consumer's console. Here it is a failure: it means an
   example declared a state and listens to nothing, so the thing it is
   demonstrating does not work. Six examples were in exactly that state before
   the audit existed and nothing said so.
 *
 * **Dormant as things stand, and kept anyway.** The audit fires on a *request*,
 * and nothing here interacts: this renders each example and looks at it. So it
 * catches only an example that drives itself, which today means none, since the
 * autoplaying carousel first moves at five seconds and this waits fifty
 * milliseconds. It is here so the trap is already covered the day something
 * does interact. Do not read a green smoke run as saying the examples are all
 * correctly wired: that is what `helix component`'s `examples` and a reader's console say.
 *
 * **An example whose script is the point gets a spec that runs it.** Rendering
 * cannot tell one chip from two, and nothing here knows which is right. The
 * browser harness's `example` mounts the file with its scripts running, and the
 * spec beside the family presses what a reader would and says what should
 * follow: `filter-input-examples.dom.spec.ts` is the first. */
const AUDIT = /is controlled: `/

const browser = await chromium.launch()

/* **One frame per worker, loaded once**, on the workers `pool` decides, every
   family that worker is given rendered into it as the one shared page did. The
   bundle defines every family before the first, so no definitions are at stake
   as they were for the specs. What a frame per family removed was whatever the
   family before left running, and with the noise cleared before every example
   that reaches an example only if it speaks while the example is watched, which
   every example already risks from the one before it in its own family. So a
   frame per family bought little, and cost a runner a frame load per family
   (see `pool`). Failures are listed in the order the examples were read,
   whichever worker rendered them.

   Measured 15 Sep 2026 on twelve cores, 567 examples clean every time and the
   output the same to the byte as on a frame per family: 21 seconds twice on four
   workers and 70 on one, against 23 twice and 87, the difference being a frame
   loaded per family. */
const families = [...Map.groupBy(examples, (one) => one.name.split('/')[0]).values()]
const byFamily = await pool(families, {
  browser,
  family: (group) => familyOf(group[0]),
  open: async (page) => {
    const noise = []
    page.on('pageerror', (error) => noise.push(`threw: ${error.message}`))
    page.on('console', (message) => {
      const text = message.text()
      if (message.type() === 'error' && !NETWORK.test(text)) {
        noise.push(`console.error: ${text}`)
      }
      if (message.type() === 'warning' && AUDIT.test(text)) {
        noise.push(`controlled and unattended: ${text}`)
      }
    })
    await page.goto(`${origin}/frame.html`, { waitUntil: 'load' })
    return { noise, page }
  },
  page: 'worker',
  run: async ({ noise, page }, family) => {
    const broken = []
    for (const example of family) {
      noise.length = 0
      const result = await page.evaluate(
        async ({ html, prefix, styles }) => {
          window.postMessage(
            { layout: 'padded', source: html, styles, type: 'helix-preview-render' },
            '*',
          )
          /* Two frames and a tick. One is not enough: an element upgrades, renders,
           and several of these place themselves in a `requestAnimationFrame` after
           that. */
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          await new Promise((done) => setTimeout(done, 50))

          const host = document.getElementById('preview-root')
          const tags = [...host.querySelectorAll('*')].filter((element) =>
            element.tagName.toLowerCase().startsWith(prefix),
          )
          return {
            painted: host.getBoundingClientRect().height,
            unupgraded: [
              ...new Set(
                tags
                  .filter((element) => !customElements.get(element.tagName.toLowerCase()))
                  .map((element) => element.tagName.toLowerCase()),
              ),
            ],
          }
        },
        { ...example, prefix: TAG_PREFIX },
      )

      const problems = [...noise]
      if (result.unupgraded.length > 0) {
        problems.push(`never upgraded: ${result.unupgraded.join(', ')}`)
      }
      if (result.painted === 0) {
        problems.push('rendered nothing at all')
      }
      if (problems.length > 0) {
        broken.push(`${example.name}\n    ${problems.join('\n    ')}`)
      }
    }
    return broken
  },
})
const failures = byFamily.flat()

await browser.close()
server.close()

if (failures.length > 0) {
  console.error(`example smoke: ${failures.length} of ${examples.length} broken\n`)
  for (const failure of failures) {
    console.error(`  ${failure}\n`)
  }
  process.exit(1)
}

console.log(
  `example smoke: ${examples.length} examples rendered clean, in Chromium` +
    (asked === undefined ? '' : `, in ${which(asked)}`),
)
