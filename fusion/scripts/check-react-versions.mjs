#!/usr/bin/env bun
/**
 * Hydrates a server-rendered page on each React version a consumer might
 * install, in Chromium, and says for each whether Helix's React bridge was
 * needed and whether it worked.
 *
 * **The bridge is a measurement of React's internals, not a contract.**
 * `helix/core/src/helix-element/react-bridge.ts` reads React's private props
 * bag to repair facebook/react#35446: React 19 attaches no custom element
 * listener while hydrating, and neither side of it writes an object property.
 * Every spec in the repository fakes that bag, and the site runs the one React
 * its lockfile holds. A consumer runs whatever they installed, so this
 * installs each version in turn, outside the repository, and asks it.
 *
 * **What it asks, for each version, build and order:**
 *
 * - **Was the bridge needed?** `probe-element` is a plain custom element given
 *   the same handler and array as the Helix ones. A handler that reaches it
 *   and an array that arrives on it are React's own doing, and a version that
 *   does both on a hydrated page no longer needs the bridge.
 * - **Did it work?** The first press of a hydrated `helix-button` reaches
 *   React's `onhelix-press`, `helix-map-route` has the array React held for it,
 *   and after a commit hands React a new handler each press still calls one
 *   handler once. In a development build, Helix logged no error.
 * - **Did React find the markup it rendered?** A Kbd's `for`, a feed's count and
 *   a listbox's highlight write nothing React reports, and a Kbd's chord still
 *   arrives. `helix-splitter` takes a camelCase prop in both orders.
 *
 * Both builds, production and development, since only a development build
 * carries the error `auditReactMissing` prints. Both orders: definitions
 * evaluated before hydration, as on a Next.js App Router page, and after it.
 *
 * **Fails only where the bridge does not work on a version Helix supports.**
 * The versions whose `supported` is false are measured and reported, and
 * never fail the run: React 18 has no `onhelix-*` support of its own at all,
 * and the canary is React's work in progress. A version that no longer needs
 * the bridge is reported with a notice, which is the day the bridge can start
 * to go: see `react-bridge.ts`.
 *
 *   bun run smoke:react
 *   bun fusion/scripts/check-react-versions.mjs --only 19.2 --json results.json
 *
 * Reads `@fusion.dev/helix` from the workspace, so the packages are built
 * first, which `smoke:react` does. Each version is installed into a scratch
 * directory under the system's temporary directory and removed after.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
import { leave } from '@fusion.dev/scripts/leave'
import { chromium } from 'playwright'

const fixture = join(import.meta.dirname, 'react-versions')

/**
 * The versions asked, by the spec `bun add` is given.
 *
 * Each minor line's newest patch, so a fix released on a line is what is
 * measured. `latest` and `canary` are npm's tags for React, read on the day.
 */
const VERSIONS = [
  { spec: '18.3', supported: false },
  { spec: '19.0', supported: true },
  { spec: '19.2', supported: true },
  { spec: 'latest', supported: true },
  { spec: 'canary', supported: false },
]

const only = argument('only')
const asked = VERSIONS.filter((one) => only === undefined || one.spec === only)
if (asked.length === 0) {
  console.error(`react versions: no version called \`${only}\`.`)
  await leave(1)
}

/** Resolves React's own packages from the scratch install, and everything else as usual. */
const reactFrom = (directory) => ({
  name: 'react-from',
  setup(build) {
    build.onResolve({ filter: /^(react|react-dom|scheduler)(\/.*)?$/ }, (args) => ({
      path: Bun.resolveSync(args.path, directory),
    }))
  },
})

/** Bundles one entry of the fixture against the React in `directory`. */
const bundle = async (directory, entry, mode, target, outdir) => {
  const built = await Bun.build({
    conditions: mode === 'development' ? ['development'] : [],
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    entrypoints: [join(fixture, entry)],
    format: 'esm',
    outdir,
    plugins: [reactFrom(directory)],
    splitting: target === 'browser',
    target,
  })
  if (!built.success) {
    throw new AggregateError(built.logs, `could not bundle ${entry} for ${mode}`)
  }
  return built.outputs.find((one) => one.kind === 'entry-point').path
}

/** Waits for a condition in the page, and says whether it came true. */
const until = (page, check, timeout = 3000) =>
  page
    .waitForFunction(check, undefined, { timeout })
    .then(() => true)
    .catch(() => false)

/** One hydrated page, asked every question. */
const measure = async (browser, origin, order) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(`threw: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.goto(`${origin}/?order=${order}`)
  /* Hydrated once React holds props for the button it renders, and the
     definitions have loaded. A React that renamed the key never says so, and
     the questions are asked anyway after the wait. */
  await until(
    page,
    () =>
      globalThis.defined === true &&
      Object.keys(document.getElementById('commit')).some((key) => key.startsWith('__reactProps$')),
  )
  await page.evaluate(() => new Promise((done) => setTimeout(done, 200)))

  const probe = await page.evaluate(() => {
    const element = document.getElementById('probe')
    element.dispatchEvent(new CustomEvent('helix-press'))
    return {
      handler: globalThis.calls.probe === 1,
      property: Array.isArray(element.points) && element.points[0]?.lat === 30.2862,
    }
  })

  await page.click('#helix')
  const first = await page.evaluate(() => globalThis.calls.helix)
  const property = await page.evaluate(() => {
    const points = document.getElementById('route').points
    return Array.isArray(points) && points.length === 2 && points[0]?.lat === 30.2862
  })

  /* Two commits, each handing React a new handler for the button, and a press
     after each: one call per press, or the bridge and React are both bound. */
  const presses = []
  for (const commits of [1, 2]) {
    await page.click('#commit')
    await page.waitForFunction(
      (want) => document.getElementById('commit').textContent === `Commits: ${want}`,
      commits,
      { timeout: 3000 },
    )
    const before = await page.evaluate(() => globalThis.calls.helix)
    await page.click('#helix')
    presses.push((await page.evaluate(() => globalThis.calls.helix)) - before)
  }

  /* React's own answer after those commits, for the report upstream: a new
     handler each render is bound by the commit, and an array that is the same
     object each render is never assigned, since React sees no change. */
  const settled = await page.evaluate(() => {
    const element = document.getElementById('probe')
    const before = globalThis.calls.probe
    element.dispatchEvent(new CustomEvent('helix-press'))
    return {
      handler: globalThis.calls.probe === before + 1,
      property: Array.isArray(element.points) && element.points[0]?.lat === 30.2862,
    }
  })

  /* What Helix writes on upgrade, and what a camelCase prop reached, once React
     has hydrated. A mismatch is logged only by a development build. */
  await page.evaluate(() => new Promise((done) => setTimeout(done, 300)))
  const written = await page.evaluate(() => ({
    position: document.getElementById('splitter').position,
    shortcut: document.getElementById('search').getAttribute('aria-keyshortcuts'),
  }))

  await context.close()
  const helix = errors.filter((one) => /Helix|helix-/.test(one))
  const mismatches = errors.filter((one) => /hydrat|did(?:n't| not) match/i.test(one))
  return {
    afterCommit: presses,
    errors,
    first: first === 1,
    mismatches,
    needed: !(probe.handler && probe.property),
    probe,
    probeAfterCommit: settled,
    property,
    works:
      first === 1 &&
      property &&
      presses.every((one) => one === 1) &&
      helix.length === 0 &&
      mismatches.length === 0 &&
      written.position === 16 &&
      written.shortcut !== null,
    written,
  }
}

const browser = await chromium.launch()
const results = []
for (const { spec, supported } of asked) {
  const directory = mkdtempSync(join(tmpdir(), 'helix-react-'))
  try {
    writeFileSync(
      join(directory, 'package.json'),
      '{ "name": "react-versions", "private": true }\n',
    )
    execFileSync('bun', ['add', `react@${spec}`, `react-dom@${spec}`], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const version = JSON.parse(
      readFileSync(join(directory, 'node_modules/react-dom/package.json'), 'utf8'),
    ).version
    for (const mode of ['production', 'development']) {
      const server = await bundle(
        directory,
        'server.jsx',
        mode,
        'bun',
        join(directory, `server-${mode}`),
      )
      const client = await bundle(
        directory,
        'client.jsx',
        mode,
        'browser',
        join(directory, `client-${mode}`),
      )
      const markup = (await import(server)).render()
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>React ${version}</title></head><body><div id="root">${markup}</div><script type="module" src="/client.js"></script></body></html>`
      const files = join(directory, `client-${mode}`)
      const serve = Bun.serve({
        fetch: (request) => {
          const path = new URL(request.url).pathname
          if (path === '/') {
            return new Response(html, { headers: { 'content-type': 'text/html' } })
          }
          const file = Bun.file(
            join(files, path === '/client.js' ? client.slice(files.length) : path),
          )
          return new Response(file)
        },
        hostname: '127.0.0.1',
        port: 0,
      })
      try {
        for (const order of ['early', 'late']) {
          const result = await measure(browser, `http://127.0.0.1:${serve.port}`, order)
          results.push({ mode, order, spec, supported, version, ...result })
        }
      } finally {
        serve.stop(true)
      }
    }
  } catch (error) {
    results.push({ error: String(error?.message ?? error), spec, supported, version: '?' })
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
}
await browser.close()

/* **The report**: a row for each version, with every build and order folded
   into it, since a version is needed or not and works or not as a whole. */
const yes = (value) => (value ? 'yes' : 'no')
/** A console line on one row of a table: its first line, and not all of that. */
const cell = (text) => {
  const line = text.split('\n')[0].replaceAll('|', '\\|')
  return line.length > 160 ? `${line.slice(0, 159)}…` : line
}
const rows = Map.groupBy(results, (one) => one.spec)
const lines = [
  '| React | Fails the run | Bridge needed | Bridge works | Notes |',
  '| --- | --- | --- | --- | --- |',
]
const failures = []
const unneeded = []
for (const [spec, runs] of rows) {
  const { supported, version } = runs[0]
  const broken = runs.filter((one) => one.error !== undefined || !one.works)
  const needed = runs.some((one) => one.needed)
  const notes = broken.map((one) =>
    one.error !== undefined
      ? `could not run: ${cell(one.error)}`
      : `${one.mode}, ${one.order}: first press ${yes(one.first)}, array ${yes(one.property)}, calls after commits ${one.afterCommit.join(' and ')}, splitter at ${one.written.position}, chord ${one.written.shortcut}${one.errors.length > 0 ? `, errors: ${one.errors.map(cell).join(' / ')}` : ''}`,
  )
  lines.push(
    `| ${version} (\`${spec}\`) | ${yes(supported)} | ${yes(needed)} | ${yes(broken.length === 0)} | ${notes.join('<br>')} |`,
  )
  if (supported && broken.length > 0) {
    failures.push(`React ${version} (${spec})`)
  }
  if (!needed && broken.length === 0) {
    unneeded.push(`React ${version} (${spec})`)
  }
}

const day = new Date().toISOString().slice(0, 10)
const report = [`React versions hydrated on ${day}:`, '', ...lines, ''].join('\n')
console.log(report)
for (const one of unneeded) {
  console.log(
    `::notice::${one} no longer needs the React bridge on ${day}: React hydrated the plain element's handler and array itself. See helix/core/src/helix-element/react-bridge.ts.`,
  )
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`)
}
const json = argument('json')
if (json !== undefined) {
  writeFileSync(json, `${JSON.stringify(results, null, 2)}\n`)
}
if (failures.length > 0) {
  console.error(`react versions: the bridge does not work on ${failures.join(', ')}.`)
  await leave(1)
}
