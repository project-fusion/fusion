#!/usr/bin/env node
/**
 * Runs `@fusion.dev/helix-diagnostics` in a real engine, against real components.
 *
 * **The unit specs cannot cover the part that matters most.** happy-dom's CSS
 * parser drops a `::part()` rule on the floor: a stylesheet whose only content
 * is `helix-button::part(button) { color: red }` parses to zero rules, and
 * `@media` around it yields a `CSSMediaRule` with an empty `cssRules`. Every
 * spec for the part rules therefore runs against hand-built rule objects, which
 * tests `analyze` completely and tests the collector's central assumption not
 * at all: that CSSOM hands back `::part()` in `selectorText` and lets you walk
 * into a grouping rule and into an open shadow root.
 *
 * That assumption is the whole product. A collector that silently reads nothing
 * is `check:prose:dialect` again, green and structurally incapable of failing, which
 * is the failure this was written around. So it is asserted
 * here, in Chromium, on a page holding real Helix elements with real adopted
 * stylesheets, with deliberate faults planted and an exact expected set.
 *
 * Playwright and a local server, the same arrangement `run-browser-specs.mjs`
 * uses and for the same two reasons: its action installs the browser's system
 * libraries in one step, and a module graph on `file://` is blocked by the
 * same-origin rules the bundles' own imports rely on.
 *
 * Run with `bun run check:spec:diagnostics`, after `bun run gen:specs`.
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { SOURCE } from '@fusion.dev/scripts/workspace'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../..')
const specs = join(root, 'fusion/site/public/specs')

/* One real family, chosen because it publishes parts on both tiers and so
   exercises the unforwarded-part finding as well as the dead-part one. */
const FAMILY = 'button'

/**
 * The page's script, built from source rather than taken from `public/specs`.
 *
 * **Importing a family's spec bundle does not define its elements.** Those
 * bundles wrap each module in esbuild's lazy initializer and only evaluate it
 * when `run()` is called, so a side-effect import registers nothing and the
 * page waits forever for a tag that never arrives. Building an entry that
 * imports the component and the collector together is two lines and has no such
 * question in it.
 */
const entry = join(root, '.local/diagnostics-entry.ts')
await Bun.write(
  entry,
  [
    `import '${join(root, SOURCE.styled, FAMILY, 'index.ts')}'`,
    /* The false-positive case, with the real components: a copy button renders
       an icon button, so `--icon-button-*` set on the outer element inherits
       through the shadow boundary and works. The manifest says copy button
       answers no hooks at all, so a rule reading it alone calls both dead. */
    `import '${join(root, 'helix/styled/src/copy-button/index.ts')}'`,
    `export { duplicateRegistrations } from '${join(root, 'helix/core/src/index.ts')}'`,
    `export { collect, diagnose } from '${join(root, 'helix/diagnostics/src/index.ts')}'`,
  ].join('\n'),
)
const bundle = await Bun.build({
  entrypoints: [entry],
  minify: false,
  target: 'browser',
})
if (!bundle.success) {
  for (const message of bundle.logs) {
    console.error(`diagnostics: ${message}`)
  }
  process.exit(1)
}
const collector = await bundle.outputs[0].text()

const manifests = {
  '@fusion.dev/helix': JSON.parse(
    await readFile(join(root, 'helix/styled/custom-elements.json'), 'utf8'),
  ),
  '@fusion.dev/helix-headless': JSON.parse(
    await readFile(join(root, 'helix/headless/custom-elements.json'), 'utf8'),
  ),
}

/* The faults, planted deliberately, one per class the collector claims to find.
   The expectation below is exact rather than a lower bound: a collector that
   reports six findings where five were planted has a false positive, and that
   is the failure mode `#238` says kills a tool like this. */
const PLANTED = `
  helix-button::part(buton) { color: red }
  helix-button::part(control) { color: red }
  helix-button::part(button) { color: green }
  helix-button { --button-backgruond-color: red }
  helix-button { --my-own-app-gap: 4px }
  helix-copy-button { --icon-button-size: 2rem; --icon-button-radius: 4px }
  helix-button { --icon-button-size: 2rem }
  @media (min-width: 1px) { helix-button::part(insidemedia) { color: red } }
`

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }

const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  if (path === '/') {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(
      `<!doctype html><meta charset="utf-8"><title>diagnostics</title>` +
        `<link rel="stylesheet" href="/frame.css">` +
        `<style id="planted">${PLANTED}</style>`,
    )
    return
  }
  try {
    const body = await readFile(
      path === '/frame.css'
        ? join(root, 'fusion/site/public/sandbox/frame.css')
        : join(specs, path.replace(/^\/+/, '')),
    )
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
const problems = []
try {
  const page = await browser.newPage()
  await page.goto(origin, { waitUntil: 'load' })

  const observed = await page.evaluate(
    async ({ collector: source, manifests: passed, tag }) => {
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
      const { collect, diagnose, duplicateRegistrations } = await import(url)

      /* Twenty real elements, so the page holds twenty real Lit shadow roots
         all adopting the one stylesheet the class owns, which is the
         arrangement the dedup assertion below is about. */
      document.body.innerHTML = `${`<${tag}>Press</${tag}>`.repeat(20)}<helix-copy-button value="x"></helix-copy-button>`
      await customElements.whenDefined(tag)
      await customElements.whenDefined('helix-copy-button')
      await new Promise((done) => requestAnimationFrame(() => done()))

      const report = diagnose({
        duplicates: duplicateRegistrations,
        tiers: Object.entries(passed).map(([name, manifest]) => ({ manifest, name })),
      })

      /* The CSSOM claims, asserted where they are actually true or not. */
      const planted = document.getElementById('planted').sheet
      const selectors = [...planted.cssRules].map((rule) => rule.selectorText ?? `@${rule.type}`)
      /* Not `find(rule => rule.cssRules)`. **In Chromium a `CSSStyleRule` has a
         `cssRules` of its own**, because CSS nesting puts child rules there, so
         that predicate matches the first plain style rule and reports an empty
         list. It is also why the collector tests `selectorText` before it tests
         `cssRules`: a nested rule is a rule and a style rule is not a grouping
         rule, and getting that order wrong loses one or the other. */
      const grouped = [...planted.cssRules].find((rule) => rule.conditionText !== undefined)
      const nests = [...planted.cssRules].some(
        (rule) => rule.selectorText !== undefined && rule.cssRules !== undefined,
      )
      const host = document.querySelector(tag)

      /* The dedup claim, asserted on the work rather than on the count.
         `coverage.sheets` is the size of the identity set and so is deduped
         whether or not the guard that skips a repeat is there, so an assertion
         on it cannot fail. What changes is how many times a rule is collected:
         one sheet adopted by twenty hosts yields its rules once with the guard
         and twenty times without it. */
      const { rules } = collect(document)
      /* Keyed on the rule object, which CSSOM makes unique per sheet and
         position. The obvious key, `${sheet}#${index}`, is not an identity: a
         Lit element adopts its own sheet and every base class's, all of them
         labeled for the same host, so eleven rules collided under it and the
         assertion failed with the dedup working perfectly. */
      const places = new Set(rules.map((one) => one.rule))

      return {
        adopted: host.shadowRoot.adoptedStyleSheets.length,
        collected: rules.length,
        distinct: places.size,
        findings: report.findings.map((finding) => ({
          expected: finding.expected,
          kind: finding.kind,
          subject: finding.subject,
        })),
        grouping: grouped ? [...grouped.cssRules].map((rule) => rule.selectorText) : [],
        hosts: document.querySelectorAll(tag).length,
        nests,
        part: selectors.filter((text) => text.includes('::part(')).length,
        readable: report.coverage.read,
        roots: report.coverage.roots,
        sheets: report.coverage.sheets,
        unreadable: report.coverage.unreadable,
      }
    },
    { collector, manifests, tag: `helix-${FAMILY}` },
  )

  const say = (message) => problems.push(message)

  if (observed.part < 3) {
    say(
      `CSSOM kept ${observed.part} of the 3 top-level \`::part()\` selectors. The collector reads part names out of \`selectorText\` and cannot work if they are not there.`,
    )
  }
  if (!observed.grouping.some((text) => text?.includes('insidemedia'))) {
    say(
      'a rule inside `@media` was not reachable through `CSSGroupingRule.cssRules`, so the collector is blind at every width but the default.',
    )
  }
  if (!observed.nests) {
    say(
      'a plain style rule reported no `cssRules` of its own, so this engine does not expose CSS nesting. The collector descends into a style rule for `&::part(x)`, and that path is now untested.',
    )
  }
  if (observed.adopted < 1) {
    say(
      "a real Lit element's open shadow root reported no adopted stylesheets, which is where component CSS lives. Coverage would be a fiction.",
    )
  }
  if (observed.roots < observed.hosts) {
    say(
      `${observed.hosts} elements were on the page and only ${observed.roots} shadow roots were traversed.`,
    )
  }
  if (observed.collected !== observed.distinct) {
    say(
      `${observed.collected} rules collected from ${observed.distinct} distinct places across ${observed.hosts} identical elements, so a stylesheet shared between hosts is being read once per host.`,
    )
  }
  if (observed.readable < 1 || observed.unreadable.length > 0) {
    say(
      `coverage came back ${observed.readable} readable and ${observed.unreadable.length} unreadable on a page whose every sheet is same-origin.`,
    )
  }

  /* Exact, not a floor: an extra finding is a false positive. */
  const expected = [
    /* `helix-copy-button { --icon-button-size }` is deliberately absent: the
       copy button renders an icon button, so it inherits and works. The same
       hook on `helix-button`, which renders no such thing, is a finding. That
       pair is the whole point of the inheritance check, and asserting the set
       exactly is what makes the pair testable at all. */
    'dead-hook:helix-button { --button-backgruond-color }',
    'dead-hook:helix-button { --icon-button-size }',
    'dead-part:helix-button::part(buton)',
    'dead-part:helix-button::part(insidemedia)',
    'unforwarded-part:helix-button::part(control)',
  ]
  const got = observed.findings.map((finding) => `${finding.kind}:${finding.subject}`).sort()
  const missing = expected.filter((one) => !got.includes(one))
  const extra = got.filter((one) => !expected.includes(one))
  if (missing.length > 0) {
    say(`planted faults the collector did not find: ${missing.join(', ')}`)
  }
  if (extra.length > 0) {
    say(`findings nothing planted, which is a false positive: ${extra.join(', ')}`)
  }
  const hook = observed.findings.find((finding) => finding.kind === 'dead-hook')
  if (hook && hook.expected !== '--button-background-color') {
    say(`the misnamed hook was found and suggested \`${hook.expected}\` rather than the real name.`)
  }

  if (problems.length === 0) {
    console.log(
      `diagnostics: ${observed.findings.length} planted faults found and none invented, ` +
        `${observed.sheets} sheets across ${observed.roots} shadow roots on ${observed.hosts} elements, ` +
        `\`::part()\` and \`@media\` both readable in Chromium`,
    )
  }
} finally {
  await browser.close()
  server.close()
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`diagnostics: ${problem}`)
  }
  process.exit(1)
}
