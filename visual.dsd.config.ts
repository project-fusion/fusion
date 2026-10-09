/**
 * The hydration config for this repository: whether what a server rendered hydrates,
 * and whether a client renders once.
 *
 * **Declarative shadow DOM is a capability Helix keeps, not one it ships.** The
 * site renders no DSD (see `helix/CONVENTIONS.md`), but a consumer rendering
 * with Lit SSR gets it, and Lit hydrates it by assuming the markup already
 * shows the client's first render: a value that differs is recorded and never
 * written, and a template that differs throws. So a component that reads its
 * children has to read them after hydration, and before the first render
 * everywhere else, or Lit's development build warns that it rendered twice.
 * Only running both holds a component to each.
 *
 * **Two sources.**
 *
 * - `corpus` is every example in both tiers, rendered by a client and hydrated
 *   from a server's markup, and the two pictures compared: an example that
 *   hydrates to something other than what a client draws is one whose server
 *   markup a reader would see go wrong.
 * - `fixtures` names the state each of 19 components must end in, from both,
 *   and is judged by that state, the errors either side logs, and Lit's
 *   change-in-update warning on the client. Its pictures are not compared.
 *
 * **In a browser, never by reading the HTML.** The conventions record a DSD
 * that survived several commits because a string check passed on markup the
 * browser then discarded, so the server's page records, before any script
 * runs, which hosts arrived without a shadow root.
 *
 * **The server's markup comes from `render-server.mjs`, in a process of its
 * own**, because Lit's SSR shim patches the globals a browser is driven from.
 * The client bundle is the site's frame entry with Lit's hydration support
 * ahead of it, in the development build that warns and says what mismatched.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from '@fusion.dev/helix-cli/visual'
import { ESTIMATE, measured } from '@fusion.dev/scripts/cost'
import { FIXTURES } from '@fusion.dev/scripts/dsd-fixtures'
import { OWN, scopeFor } from '@fusion.dev/scripts/scope'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'

const TIERS = [
  { name: 'headless', sheet: false, source: join(root, SOURCE.headless) },
  { name: 'styled', sheet: true, source: join(root, SOURCE.styled) },
]
const WORK = join(root, '.local/dsd')

/** The development bundle with Lit's hydration support, built once per run. */
let bundling: Promise<string> | undefined
const bundle = () => {
  bundling ??= (async () => {
    mkdirSync(WORK, { recursive: true })
    const entry = join(WORK, 'entry.js')
    writeFileSync(
      entry,
      "import '@lit-labs/ssr-client/lit-element-hydrate-support.js'\n" +
        `import ${JSON.stringify(join(root, 'fusion/site/preview/preview-frame-entry.ts'))}\n`,
    )
    const built = await Bun.build({
      conditions: ['development'],
      entrypoints: [entry],
      format: 'iife',
      target: 'browser',
    })
    if (!built.success) {
      throw new Error(`the client bundle did not build: ${built.logs.join('; ')}`)
    }
    const file = join(WORK, 'frame.js')
    writeFileSync(file, await built.outputs[0].text())
    return file
  })()
  return bundling
}

/** Each markup's server render, by id, from `render-server.mjs` in a process of its own. */
const render = (label: string, items: { id: string; markup: string }[]) => {
  mkdirSync(WORK, { recursive: true })
  const input = join(WORK, `${label}-in.json`)
  const output = join(WORK, `${label}-out.json`)
  writeFileSync(input, JSON.stringify(items))
  const rendering = Bun.spawnSync(
    ['bun', join(root, 'fusion/scripts/render-server.mjs'), input, output],
    {
      cwd: root,
      stderr: 'pipe',
      stdout: 'pipe',
    },
  )
  if (rendering.exitCode !== 0) {
    throw new Error(`the server render failed as a whole: ${rendering.stderr.toString().trim()}`)
  }
  return JSON.parse(readFileSync(output, 'utf8')) as Record<
    string,
    { error?: string; server?: string }
  >
}

/** Before any script runs, which hosts arrived without a shadow root. Read back once the page has settled. */
const PARSED = `<script>
  window.__rootless = [...document.querySelectorAll('*')]
    .filter((one) => one.localName.startsWith('helix-') && !one.shadowRoot)
    .map((one) => one.localName)
</script>`

/**
 * An example's own scripts, made to run after hydration. On a server-rendered
 * page the definitions load and hydrate what was sent, and the page's scripts
 * then change it; an inline script runs mid-parse, before any definition, so it
 * set properties the server never rendered with and hydration met a value the
 * markup did not show. A module script runs after parsing, after the deferred
 * bundle.
 */
const afterHydration = (markup: string) => markup.replaceAll('<script>', '<script type="module">')

/** Where each heading and cell under a host stands, by its place in the host, and the host's height. */
const LAYOUT = `(host) => {
  const origin = host.getBoundingClientRect()
  const box = (one) => {
    const shown = getComputedStyle(one).display === 'contents'
      ? one.shadowRoot?.querySelector('[part="column"]') ?? one
      : one
    const { height, width, x, y } = shown.getBoundingClientRect()
    return [one.textContent.trim(), ...[x - origin.x, y - origin.y, width, height].map(Math.round)].join(' ')
  }
  return ['height ' + Math.round(origin.height), ...[...host.querySelectorAll('helix-table-column, helix-table-cell')].map(box)]
}`

/**
 * A fixture held to its first paint is measured once the fonts are in and
 * before the definitions are: measured as the page parses, the words were in
 * the fallback face and the hydrated ones in the sheet's, a pixel apart for a
 * reason that is the harness's. So the bundle loads after the fonts.
 */
const STILL = `<script>
  const still = () => Object.fromEntries([...document.querySelectorAll('[data-still]')]
    .map((holder) => [holder.dataset.fixture, (${LAYOUT})(holder.firstElementChild)]))
  still()
  document.fonts.ready.then(() => {
    window.__still = still()
    const bundle = document.createElement('script')
    bundle.src = '/frame.js'
    document.body.append(bundle)
  })
</script>`

const rootless = async (page: import('playwright').Page) => [
  ...new Set(
    await page.evaluate(() => (window as unknown as { __rootless?: string[] }).__rootless ?? []),
  ),
]

const corpus = async ({ changed }: { changed?: string }) => {
  const scope =
    changed === undefined
      ? null
      : scopeFor(changed, { label: 'dsd', own: OWN.dsd, root, tiers: TIERS })
  const examples: {
    dir: string
    family: string
    id: string
    markup: string
    slug: string
    tier: (typeof TIERS)[number]
  }[] = []
  const skipped = new Set<string>()
  for (const tier of TIERS) {
    for (const entry of readdirSync(tier.source, { withFileTypes: true })) {
      const dir = join(tier.source, entry.name, '.examples')
      if (!entry.isDirectory() || !existsSync(dir)) {
        continue
      }
      if (scope !== null && !scope.has(entry.name)) {
        skipped.add(entry.name)
        continue
      }
      for (const file of readdirSync(dir)
        .filter((one) => one.endsWith('.html'))
        .sort()) {
        const slug = file.replace(/\.html$/, '')
        const id = `${tier.name}/${entry.name}/${slug}`
        examples.push({
          dir,
          family: entry.name,
          id,
          markup: readFileSync(join(dir, file), 'utf8'),
          slug,
          tier,
        })
      }
    }
  }
  const server =
    examples.length > 0
      ? render(
          'corpus',
          examples.map(({ id, markup }) => ({ id, markup })),
        )
      : {}
  const frame = await bundle()
  return {
    note:
      skipped.size > 0
        ? `${skipped.size} families the change does not reach are not compared`
        : undefined,
    pairs: examples.map((one) => {
      const shared = {
        dir: one.dir,
        files: { 'styles.css': `${one.slug}.css` },
        scripts: ['/frame.js'],
        styles: [...(one.tier.sheet ? ['/frame.css'] : []), 'styles.css'],
      }
      const rendered = server[one.id] ?? { error: 'the server render returned nothing for it' }
      return {
        a: { ...shared, body: one.markup },
        b:
          rendered.error === undefined
            ? { ...shared, body: afterHydration(rendered.server ?? '') + PARSED }
            : { error: `the server render threw, ${rendered.error}` },
        group: one.family,
        name: one.id,
      }
    }),
    serve: { '/frame.js': frame },
  }
}

const fixtures = async () => {
  const server = render(
    'fixtures',
    FIXTURES.map((fixture) => ({ id: fixture.name, markup: fixture.markup })),
  )
  const frame = await bundle()
  const holder = (fixture: (typeof FIXTURES)[number], markup: string, tail: string) =>
    `<div data-fixture="${fixture.name}"${fixture.still ? ' data-still' : ''}>${markup}</div>${tail}`
  return {
    pairs: FIXTURES.map((fixture) => {
      const rendered = server[fixture.name] ?? {
        error: 'the server render returned nothing for it',
      }
      return {
        a: { body: holder(fixture, fixture.markup, PARSED + STILL), styles: ['/frame.css'] },
        b:
          rendered.error === undefined
            ? {
                body: holder(fixture, rendered.server ?? '', PARSED + STILL),
                styles: ['/frame.css'],
              }
            : { error: `the server render threw, ${rendered.error}` },
        group: 'fixtures',
        name: fixture.name,
      }
    }),
    serve: { '/frame.js': frame },
  }
}

export default defineConfig({
  exceptions: [
    {
      entry: 'styled/video/native',
      reason: "The user agent's own video controls, which parity measured as never settling.",
      unstable: true,
    },
  ],
  platform: 'any',
  report: '.helix/dsd',
  serve: {
    '/fonts/': 'fusion/site/public/fonts/',
    '/frame.css': 'fusion/site/public/sandbox/frame.css',
  },
  settle: { readyProperty: 'whenSettled' },
  shard: { cost: measured('dsd'), perShot: ESTIMATE.dsd.per },
  shots: [{ name: 'wide', scheme: 'light', suffix: '', width: 640 }],
  sources: [
    {
      check: async ({ entry, page }) => {
        if (entry.side !== 'hydrated') {
          return []
        }
        const missing = await rootless(page)
        return missing.length > 0
          ? [`${missing.join(', ')} arrived from the server with no shadow root`]
          : []
      },
      errors: 'new',
      kind: 'pairs',
      labels: ['client', 'hydrated'],
      name: 'corpus',
      prepare: corpus,
    },
    {
      check: async ({ console, entry, page }) => {
        const fixture = FIXTURES.find((one) => one.name === entry.name)
        if (fixture === undefined) {
          return [`no fixture is named ${entry.name}`]
        }
        const problems: string[] = []
        const problem = await page.evaluate((check) => {
          const host = document.querySelector('[data-fixture]')?.firstElementChild
          if (!host) {
            return 'is not on the page'
          }
          try {
            return new Function('host', check)(host)
          } catch (error) {
            return `threw ${(error as Error).message}`
          }
        }, fixture.check)
        if (problem) {
          problems.push(problem)
        }
        if (entry.side === 'hydrated') {
          const missing = await rootless(page)
          if (missing.length > 0) {
            problems.push(`${missing.join(', ')} arrived with no shadow root`)
          }
          if (fixture.still) {
            const moved = await page.evaluate(
              ({ layout, name }) => {
                const measure = new Function(`return ${layout}`)()
                const before: string[] = (
                  window as unknown as { __still: Record<string, string[]> }
                ).__still[name]
                const after: string[] = measure(
                  document.querySelector(`[data-fixture="${name}"]`)?.firstElementChild,
                )
                const changed = before.filter((one, index) => one !== after[index])
                return changed.length === 0 && before.length === after.length
                  ? null
                  : `${changed.slice(0, 3).join(', ')} to ${after
                      .filter((one) => !before.includes(one))
                      .slice(0, 3)
                      .join(', ')}`
              },
              { layout: LAYOUT, name: fixture.name },
            )
            if (moved) {
              problems.push(`moved from its first paint, ${moved}`)
            }
          }
        } else {
          /* Lit's development build says when an element rendered a second
             time from inside its first update. A fixture with `twice` names
             why its tag may, which is the exception the warning itself names. */
          const allowed = fixture.twice ? /^<([a-z-]+)/.exec(fixture.markup)?.[1] : undefined
          const twice = new Set(
            console
              .map((message) => /Element (\S+) scheduled an update/.exec(message.text)?.[1])
              .filter((tag): tag is string => tag !== undefined && tag !== allowed),
          )
          for (const tag of twice) {
            problems.push(`${tag} rendered twice (Lit's change-in-update warning)`)
          }
        }
        return problems
      },
      compare: false,
      errors: 'any',
      harness: false,
      kind: 'pairs',
      labels: ['client', 'hydrated'],
      name: 'fixtures',
      prepare: fixtures,
    },
  ],
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: `helix visual` runs outside turbo, so no task's cache reads it.
  timings: process.env.BROWSER_COST,
})
