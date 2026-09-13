#!/usr/bin/env bun
/**
 * Whether what a server rendered hydrates, and whether a client renders once.
 *
 *   check-dsd.mjs [family] [--fixtures | --corpus] [--changed <ref>]
 *
 * `--changed` compares only the families a change since `<ref>` reaches, by the
 * rule parity scopes with, and says which it skipped. The fixtures always run.
 *
 * **Declarative shadow DOM is a capability Helix keeps, not one it ships.** The
 * site renders no DSD (see `helix/CONVENTIONS.md`), but a consumer rendering
 * with Lit SSR gets it, and Lit hydrates it by assuming the markup already shows
 * the client's first render: a value that differs is recorded and never
 * written, and a template that differs throws. So a component that reads its
 * children has to read them after hydration, and before the first render
 * everywhere else, or Lit's dev build warns that it rendered twice. The two
 * pull in opposite directions, and only running both can hold a component to
 * each.
 *
 * **Two halves.** The fixtures name a state each component must end in, and
 * load it twice: from the server's markup, parsed as HTML so its templates
 * become shadow roots, and from the bare markup a client renders. The server's
 * must throw nothing and the client's must draw no change-in-update warning.
 * The corpus is every example in both tiers, rendered by a client and hydrated
 * from a server, and the two pictures compared the way parity compares an
 * example's HTML with its TSX: an example that hydrates to something other than
 * what a client draws is one whose server markup a reader would see go wrong.
 *
 * **In a browser, never by reading the HTML.** The conventions record a DSD
 * that survived several commits because a string check passed on markup the
 * browser then discarded. So the server's page is asked, before any script has
 * run, which of its hosts arrived without a shadow root.
 *
 * The server's markup is rendered by `render-server.mjs` in a process of its
 * own, because Lit's SSR shim patches the globals this one drives a browser with.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE } from '@fusion.dev/scripts/workspace'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { scopeFor } from './lib/scope.mjs'
import { awaitStill, awaitUpgrades } from './lib/settle.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * What each fixture is, and what it must end as.
 *
 * `check` is a function body run in the page with `host` bound to the fixture's
 * element, returning `null` when the state is right and a sentence when it is
 * not. `dsd: false` with a reason keeps a component out of the server's page
 * for a limit that is the platform's, and says so in the output. `twice` with a
 * reason lets a component render a second time on the client where that render
 * answers a measurement of the first, which is the exception Lit's warning
 * itself names, and says so too.
 */
const FIXTURES = [
  {
    check: `const value = host.shadowRoot.querySelector('[part="copy"]')?.value
      return value === 'bun run migrate' ? null : 'copies ' + JSON.stringify(value)`,
    markup: '<helix-code-block>bun run migrate</helix-code-block>',
    name: 'code-block',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const branch = host.querySelector('helix-tree-item')
      return branch.shadowRoot.querySelector('[aria-expanded]') ? null : 'draws its branch as a leaf'`,
    markup:
      '<helix-tree label="Files"><helix-tree-item>src<helix-tree-item slot="children">index.ts</helix-tree-item></helix-tree-item></helix-tree>',
    name: 'tree',
  },
  {
    check: `return host.shadowRoot.querySelector('[part="empty"]') ? null : 'does not say it is empty'`,
    markup: '<helix-tree label="Nothing"></helix-tree>',
    name: 'tree-empty',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const parent = host.querySelector('helix-menu-item')
      return parent.shadowRoot.querySelector('[aria-haspopup="menu"]') ? null : 'offers no submenu'`,
    markup:
      '<helix-menu label="Actions"><helix-menu-item>Sort<helix-menu-item slot="submenu" value="name">Name</helix-menu-item></helix-menu-item><helix-menu-item value="copy">Copy</helix-menu-item></helix-menu>',
    name: 'menu',
  },
  {
    check: `if (host.shadowRoot.querySelector('[part="empty"]')) return 'says it is empty'
      const body = host.shadowRoot.querySelector('slot:not([name])')
      return body && body.assignedElements().length === 1 ? null : 'shows ' + (body ? body.assignedElements().length : 'no') + ' rows'`,
    markup:
      '<helix-table label="Ways back"><helix-table-column>Option</helix-table-column><helix-table-row><helix-table-cell>Roll back</helix-table-cell></helix-table-row></helix-table>',
    name: 'table',
  },
  {
    check: `const header = host.shadowRoot.querySelector('[part="header"]')
      if (header && getComputedStyle(header).display !== 'none' && !header.hidden) return 'draws a header nobody filled'
      const log = host.shadowRoot.querySelector('slot[name="messages"]')
      return log && log.assignedElements().length === 1 ? null : 'shows ' + (log ? log.assignedElements().length : 'no') + ' turns'`,
    markup:
      '<helix-chat label="Support"><helix-chat-message author="them" state="sent">How can I help?</helix-chat-message></helix-chat>',
    name: 'chat',
  },
  {
    check: `const head = [...host.shadowRoot.querySelectorAll('[part="head"] slot')].flatMap((slot) => slot.assignedElements())
      return head.map((column) => column.textContent.trim()).join('|') === 'Name|Size'
        ? null
        : 'heads its columns ' + JSON.stringify(head.map((column) => column.textContent.trim()))`,
    markup:
      '<helix-data-table label="Files"><helix-table-column field="name">Name</helix-table-column><helix-table-column field="size">Size</helix-table-column></helix-data-table>',
    name: 'data-table',
  },
  {
    check: `const list = host.shadowRoot.querySelector('slot[name="items"]')?.assignedElements() ?? []
      if (list.length !== 2) return 'lists ' + list.length + ' of 2 rows'
      const group = host.querySelector('helix-notification-group')
      const showing = group.shadowRoot.querySelector('slot:not([name])')?.assignedElements() ?? []
      return showing.length === 1 ? null : 'a folded group shows ' + showing.length + ' of 1 row'`,
    markup:
      '<helix-notifications label="Inbox"><helix-notification at="2026-09-09T03:00:00Z"><span>Deploy finished</span></helix-notification><helix-notification-group collapsible label="Earlier"><helix-notification at="2026-09-08T03:00:00Z"><span>Build failed</span></helix-notification><helix-notification at="2026-09-07T03:00:00Z"><span>Build passed</span></helix-notification></helix-notification-group></helix-notifications>',
    name: 'notifications',
  },
  {
    check: `const panes = [...host.shadowRoot.querySelectorAll('[part="slide"] slot')].map((slot) => slot.assignedElements().length)
      return panes.join(',') === '1,1' ? null : 'holds slides as ' + JSON.stringify(panes)`,
    markup: '<helix-carousel label="Photos"><div>One</div><div>Two</div></helix-carousel>',
    name: 'carousel',
  },
  {
    check: `const offered = Boolean(host.shadowRoot.querySelector('[part="eyedropper"]'))
      return offered === 'EyeDropper' in window ? null : (offered ? 'offers' : 'withholds') + ' the eyedropper'`,
    markup: '<helix-color-picker label="Accent" value="#3366ff"></helix-color-picker>',
    name: 'color-picker',
  },
  {
    check: `const boxes = [...host.querySelectorAll('helix-checkbox')]
      return host.value === 'cheese' && boxes[0].checked && !boxes[1].checked
        ? null
        : 'holds ' + JSON.stringify(host.value)`,
    markup:
      '<helix-checkbox-group label="Toppings"><helix-checkbox value="cheese" checked>Cheese</helix-checkbox><helix-checkbox value="olives">Olives</helix-checkbox></helix-checkbox-group>',
    name: 'checkbox-group',
  },
  {
    check: `const rows = host.shadowRoot.querySelectorAll('[part="row"]').length
      return rows > 0 ? null : 'draws no rows'`,
    markup:
      '<helix-object-inspector for="dsd-object" label="Payload"></helix-object-inspector><script type="application/json" id="dsd-object">{"id":42,"tags":["a","b"]}</script>',
    name: 'object-inspector',
  },
  {
    check: `const drawn = host.querySelectorAll('[data-index]').length
      return drawn === 2 ? null : 'draws ' + drawn + ' of 2 rows'`,
    markup:
      '<helix-virtual-list estimate="32" for="dsd-rows" label="Rows"><template><div data-field="name"></div></template></helix-virtual-list><script type="application/json" id="dsd-rows">[{"name":"One"},{"name":"Two"}]</script>',
    name: 'virtual-list',
    twice: 'it works out which rows fit from the box the first render laid out',
  },
  {
    check: `const entries = [...host.shadowRoot.querySelectorAll('[part="entry"]')].map((entry) => entry.textContent.trim())
      return entries.join('|') === 'Off|English|Deutsch' ? null : 'offers ' + JSON.stringify(entries)`,
    markup:
      '<helix-video label="Clip"><track kind="captions" label="English" srclang="en" src="data:text/vtt,WEBVTT"><track label="Deutsch" srclang="de" src="data:text/vtt,WEBVTT"></helix-video>',
    name: 'video',
  },
  {
    check: `const chosen = [...host.querySelectorAll('helix-option')].filter((option) => option.selected)
      return chosen.length === 1 && chosen[0].value === 'banana'
        ? null
        : 'marks ' + JSON.stringify(chosen.map((option) => option.value))`,
    markup:
      '<helix-listbox label="Fruit" value="banana"><helix-option value="apple">Apple</helix-option><helix-option value="banana">Banana</helix-option></helix-listbox>',
    name: 'listbox',
  },
]

/**
 * Families whose examples do not hydrate yet, each with the cause found.
 *
 * **Parity's bargain, applied to a backlog.** A family here is still rendered
 * and compared, and its findings are held rather than failed on, so the check
 * can guard every family that does hydrate while these are worked through. One
 * whose examples all hydrate twice over is reported as spent, which fails the
 * run until the entry comes out: a list nobody is made to shorten only grows.
 */
const KNOWN = new Map([
  [
    'avatar',
    'a failed image fires `error` while the page is parsed, before anything listens, so the fallback never shows; a group counts its avatars while rendering',
  ],
  [
    'carousel',
    '`controlled` names the slide at `index`, and a hydrating render has no slides to find it among',
  ],
  [
    'image',
    'a picture that fails fires `error` while the page is parsed, before anything listens, so the event it relays is heard on some runs and not others',
  ],
  ['sandbox', "the site's editor, whose leading pane differs once hydrated; cause not traced"],
  ['tour', 'places its stop against a target elsewhere in the page, which a server cannot see'],
  [
    'video',
    'reads its extra controls from its children while rendering, and its muted state from the video element',
  ],
])

/**
 * The examples not compared, each with what was measured, as parity keeps them.
 */
const UNCOMPARED = new Map([
  [
    'styled/video/native',
    "the user agent's own video controls, which parity measured as never settling",
  ],
])

const args = process.argv.slice(2)
const changedAt = args.indexOf('--changed')
/* The slot after `--changed` is a ref, not a family: see parity. */
const only = args.find(
  (one, at) => !one.startsWith('--') && !(changedAt !== -1 && at === changedAt + 1),
)
const wantsFixtures = !args.includes('--corpus')
const wantsCorpus = !args.includes('--fixtures')

const WIDTH = 640
const work = join(root, '.local/dsd')
const SHEET = join(root, 'fusion/site/public/sandbox/frame.css')
const FONTS = join(root, 'fusion/site/public/fonts')
const TIERS = [
  { name: 'headless', sheet: false, source: join(root, SOURCE.headless) },
  { name: 'styled', sheet: true, source: join(root, SOURCE.styled) },
]

/**
 * The example corpus: every example in both tiers, markup only.
 *
 * Every one, and not only those with a TSX twin as parity needs: this asks
 * whether a server's markup hydrates, and the HTML is that markup.
 */
const scope =
  changedAt === -1
    ? null
    : scopeFor(args[changedAt + 1], {
        label: 'dsd',
        own: ['fusion/scripts/check-dsd.mjs', 'fusion/scripts/render-server.mjs'],
        root,
        tiers: TIERS,
      })
const skipped = new Set()
const corpus = []
if (wantsCorpus) {
  for (const tier of TIERS) {
    for (const entry of readdirSync(tier.source, { withFileTypes: true })) {
      const dir = join(tier.source, entry.name, '.examples')
      if (!entry.isDirectory() || !existsSync(dir) || (only !== undefined && entry.name !== only)) {
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
        corpus.push({
          dir,
          family: entry.name,
          id: `${tier.name}/${entry.name}/${slug}`,
          markup: readFileSync(join(dir, file), 'utf8'),
          slug,
          tier,
        })
      }
    }
  }
}
const fixtures = wantsFixtures
  ? FIXTURES.filter((fixture) => only === undefined || fixture.name === only)
  : []

/* The server's markup for all of it, from a process of its own. */
await mkdir(work, { recursive: true })
const input = join(work, 'render-in.json')
const output = join(work, 'render-out.json')
writeFileSync(
  input,
  JSON.stringify([
    ...fixtures
      .filter((fixture) => fixture.dsd !== false)
      .map((fixture) => ({ id: `fixture:${fixture.name}`, markup: fixture.markup })),
    ...corpus.map((one) => ({ id: one.id, markup: one.markup })),
  ]),
)
const rendering = Bun.spawnSync(
  ['bun', join(root, 'fusion/scripts/render-server.mjs'), input, output],
  { cwd: root, stderr: 'pipe', stdout: 'pipe' },
)
if (rendering.exitCode !== 0) {
  console.error(rendering.stderr.toString())
  throw new Error('dsd: the server render failed as a whole, so nothing here was checked')
}
const server = JSON.parse(readFileSync(output, 'utf8'))

/* The site's own frame entry, both tiers and everything an example reaches for,
   with Lit's hydration support ahead of it so it has patched `LitElement` by the
   time the first element is defined. It is inert for an element that arrives
   without a shadow root, so the client's page loads the same bundle and the two
   differ only in their markup. The development build, because it is the one that
   warns and the one whose hydration errors say what mismatched. */
const entry = join(work, 'entry.js')
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
  console.error(built.logs.join('\n'))
  throw new Error('dsd: the client bundle did not build')
}
const bundle = await built.outputs[0].text()
const sheet = readFileSync(SHEET)

/* Before any script runs, which hosts arrived without a shadow root. Written
   into the server's page only, and read back once it has settled. */
const PARSED = `<script>
  window.__rootless = [...document.querySelectorAll('*')]
    .filter((one) => one.localName.startsWith('helix-') && !one.shadowRoot)
    .map((one) => one.localName)
</script>`

const fixturePage = (mode) => {
  const holders = fixtures
    .filter((fixture) => mode === 'client' || fixture.dsd !== false)
    .map(
      (fixture) =>
        `<div data-fixture="${fixture.name}">${
          mode === 'server' ? server[`fixture:${fixture.name}`].server : fixture.markup
        }</div>`,
    )
    .join('\n')
  return `<!doctype html><meta charset="utf-8"><title>dsd</title>${holders}${PARSED}<script src="/frame.js"></script>`
}

/**
 * The example's own scripts, made to run after hydration rather than before it.
 *
 * **The order a server-rendered page runs in.** There the definitions load and
 * hydrate what was sent, and the page's scripts then change it. An example's
 * inline script runs mid-parse, before any definition, so on the server's page
 * it set properties the server never rendered with, a `date`, a table's `rows`,
 * and hydration met a value the markup did not show: a fault of the harness,
 * not the component, and one Lit documents as the consumer's to avoid. A module
 * script runs after parsing, in order after the deferred bundle, and each
 * script's microtasks, where the hydrating updates are, run before the next.
 * The client's page keeps the scripts where the example put them.
 */
const afterHydration = (markup) => markup.replaceAll('<script>', '<script type="module">')

/* The page parity takes a picture of, so the two harnesses agree on what an
   example looks like: the tier's sheet, the example's own, and a fixed width.
   `defer`, for the reason parity records: an element that upgrades mid-parse
   cannot find what follows it. */
const corpusPage = (one, mode) =>
  '<!doctype html><meta charset="utf-8"><title>dsd</title>' +
  (one.tier.sheet ? '<link rel="stylesheet" href="/frame.css">' : '') +
  '<link rel="stylesheet" href="styles.css">' +
  '<style>:root{color-scheme:light}' +
  `body{margin:0;padding:24px;background:#fff;width:${WIDTH}px;box-sizing:border-box}</style>` +
  `<script defer src="/frame.js"></script>` +
  (mode === 'server' ? afterHydration(server[one.id].server) : one.markup) +
  (mode === 'server' ? PARSED : '')

const listening = Bun.serve({
  fetch(request) {
    const { pathname } = new URL(request.url)
    const reply = (body, type) => new Response(body, { headers: { 'content-type': type } })
    if (pathname === '/frame.js') {
      return reply(bundle, 'text/javascript')
    }
    if (pathname === '/frame.css') {
      return reply(sheet, 'text/css')
    }
    const face = /^\/fonts\/([a-z0-9-]+\.woff2)$/.exec(pathname)
    if (face !== null && existsSync(join(FONTS, face[1]))) {
      return reply(readFileSync(join(FONTS, face[1])), 'font/woff2')
    }
    const fixture = /^\/fixtures\/(server|client)$/.exec(pathname)
    if (fixture !== null) {
      return reply(fixturePage(fixture[1]), 'text/html')
    }
    const asked =
      /^\/(server|client)\/(headless|styled)\/([a-z0-9-]+)\/([a-z0-9.-]+)\/(styles\.css)?$/.exec(
        pathname,
      )
    const one = asked && corpus.find((each) => each.id === `${asked[2]}/${asked[3]}/${asked[4]}`)
    if (!one) {
      return new Response('not here', { status: 404 })
    }
    if (asked[5] !== undefined) {
      const file = join(one.dir, `${one.slug}.css`)
      return reply(existsSync(file) ? readFileSync(file) : '', 'text/css')
    }
    return reply(corpusPage(one, asked[1]), 'text/html')
  },
  hostname: '127.0.0.1',
  port: 0,
})
const origin = `http://127.0.0.1:${listening.port}`

const browser = await chromium.launch()
/* `reducedMotion` and nothing leaving the machine, for the reasons parity gives:
   a canvas holds still only when asked to, and a remote asset answers
   differently each time. */
const tab = await browser.newPage({
  reducedMotion: 'reduce',
  viewport: { height: 800, width: WIDTH },
})
await tab.route('**/*', (route) =>
  route.request().url().startsWith(origin) ? route.continue() : route.abort(),
)
const said = []
const warned = new Set()
tab.on('pageerror', (error) => said.push(error.message))
tab.on('console', (message) => {
  const text = message.text()
  if (message.type() === 'error') {
    said.push(text)
  }
  const twice = /Element (\S+) scheduled an update/.exec(text)
  if (twice) {
    warned.add(twice[1])
  }
})
const load = async (url) => {
  said.length = 0
  warned.clear()
  await tab.goto(url, { waitUntil: 'load' })
  const undefinedTags = await awaitUpgrades(tab)
  await awaitStill(tab)
  return { undefinedTags }
}

const failures = []

/* The fixtures: each asked for the state it must end in, both ways. */
if (fixtures.length > 0) {
  for (const mode of ['server', 'client']) {
    await load(`${origin}/fixtures/${mode}`)
    const rootless = mode === 'server' ? await tab.evaluate(() => window.__rootless) : []
    const results = await tab.evaluate(
      (list) =>
        list.map(({ check, name }) => {
          const host = document.querySelector(`[data-fixture="${name}"]`)?.firstElementChild
          if (!host) {
            return { name, problem: 'is not on the page' }
          }
          try {
            return { name, problem: new Function('host', check)(host) }
          } catch (error) {
            return { name, problem: `threw ${error.message}` }
          }
        }),
      fixtures
        .filter((fixture) => mode === 'client' || fixture.dsd !== false)
        .map(({ check, name }) => ({ check, name })),
    )
    for (const { name, problem } of results) {
      if (problem) {
        failures.push(
          `${name}, ${mode === 'server' ? 'hydrated' : 'rendered on the client'}: ${problem}`,
        )
      }
    }
    if (rootless.length > 0) {
      failures.push(
        `fixtures, from the server: ${[...new Set(rootless)].join(', ')} arrived with no shadow root`,
      )
    }
    for (const error of said) {
      failures.push(
        `fixtures, ${mode === 'server' ? 'hydrating' : 'rendering on the client'}: ${error}`,
      )
    }
    if (mode === 'client') {
      const measuring = new Set(
        fixtures
          .filter((fixture) => fixture.twice)
          .map((fixture) => /^<([a-z-]+)/.exec(fixture.markup)[1]),
      )
      for (const tag of [...warned].filter((one) => !measuring.has(one))) {
        failures.push(
          `${tag}, rendered on the client: rendered twice (Lit's change-in-update warning)`,
        )
      }
    }
  }
}

/* The corpus: each example rendered by a client and hydrated from a server, and
   the two pictures compared. Taken twice where they differ, and reported only if
   they differ again, for the reason parity retries. */
const picture = async (one, mode) => {
  const { undefinedTags } = await load(`${origin}/${mode}/${one.id}/`)
  return {
    errors: [...said],
    rootless: mode === 'server' ? await tab.evaluate(() => window.__rootless) : [],
    shot: await tab.screenshot({ animations: 'disabled', fullPage: true }),
    undefinedTags,
  }
}
/** What is wrong with one example, as sentences, or nothing. */
const examine = async (one) => {
  const rendered = server[one.id]
  if (rendered.error !== undefined) {
    return [`${one.id}: the server render threw, ${rendered.error}`]
  }
  let client = await picture(one, 'client')
  let hydrated = await picture(one, 'server')
  if (!client.shot.equals(hydrated.shot)) {
    client = await picture(one, 'client')
    hydrated = await picture(one, 'server')
  }
  const missing = [...new Set([...client.undefinedTags, ...hydrated.undefinedTags])]
  if (missing.length > 0) {
    return [`${one.id}: ${missing.join(', ')} never upgraded`]
  }
  const found = []
  if (hydrated.rootless.length > 0) {
    found.push(
      `${one.id}: ${[...new Set(hydrated.rootless)].join(', ')} arrived from the server with no shadow root`,
    )
  }
  const fresh = hydrated.errors.filter((error) => !client.errors.includes(error))
  if (fresh.length > 0) {
    found.push(`${one.id}: hydrating said ${fresh.slice(0, 2).join(' | ')}`)
  }
  const a = PNG.sync.read(client.shot)
  const b = PNG.sync.read(hydrated.shot)
  if (a.width !== b.width || a.height !== b.height) {
    found.push(
      `${one.id}: the client renders ${a.width}x${a.height} and the hydrated page ${b.width}x${b.height}`,
    )
    return found
  }
  const diff = new PNG({ height: a.height, width: a.width })
  const moved = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  if (moved > 0) {
    const file = join(work, 'diff', `${one.id.replaceAll('/', '--')}.png`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, PNG.sync.write(diff))
    /* Both sides beside the marks, because a diff shows where and not what. */
    writeFileSync(file.replace(/\.png$/, '.client.png'), client.shot)
    writeFileSync(file.replace(/\.png$/, '.hydrated.png'), hydrated.shot)
    found.push(`${one.id}: ${moved} pixels differ once hydrated, marked at ${relative(root, file)}`)
  }
  return found
}

let clean = 0
const heldLines = []
/* Findings against a known family are counted and held rather than failed on. */
const held = new Map([...KNOWN.keys()].map((family) => [family, 0]))
for (const one of corpus.filter((each) => !UNCOMPARED.has(each.id))) {
  const found = await examine(one)
  if (held.has(one.family)) {
    held.set(one.family, held.get(one.family) + found.length)
    /* Named in full on a run narrowed to one family, which is the run somebody
       fixing it makes. */
    if (only !== undefined) {
      heldLines.push(...found)
    }
  } else if (found.length > 0) {
    failures.push(...found)
  } else {
    clean += 1
  }
}

/* **A known family that has stopped failing is spent, once it has stopped
   twice.** Some of these fail on a race, an event that fires before or after
   hydration depending on how fast a request fails, so one clean pass is as
   likely to be luck as a fix. The same confirmation parity asks of a listed
   exception before calling it spent. */
const reached = new Set(corpus.map((one) => one.family))
for (const [family, count] of held) {
  if (!reached.has(family) || count > 0) {
    continue
  }
  let again = 0
  for (const one of corpus.filter((each) => each.family === family && !UNCOMPARED.has(each.id))) {
    again += (await examine(one)).length
  }
  held.set(family, again)
  if (again === 0) {
    failures.push(
      `${family}: every example hydrated twice over, so its entry in KNOWN is spent. It was listed for "${KNOWN.get(family)}". Take it out.`,
    )
  }
}

await browser.close()
listening.stop()

const notes = [
  ...fixtures
    .filter((fixture) => fixture.dsd === false)
    .map((fixture) => `${fixture.name} was rendered on the client only: ${fixture.reason}`),
  ...fixtures
    .filter((fixture) => fixture.twice)
    .map((fixture) => `${fixture.name} may render twice on the client: ${fixture.twice}`),
  ...[...UNCOMPARED]
    .filter(([id]) => corpus.some((one) => one.id === id))
    .map(([id, reason]) => `${id} is not compared: ${reason}`),
  ...[...held]
    .filter(([family, count]) => reached.has(family) && count > 0)
    .map(
      ([family, count]) =>
        `${family} does not hydrate yet (${count} finding(s)): ${KNOWN.get(family)}`,
    ),
]
  .map((line) => `\n  ${line}`)
  .join('')
if (failures.length > 0) {
  console.error(
    `dsd: ${failures.length} problem(s)\n${failures.map((line) => `  ${line}`).join('\n')}${notes}`,
  )
  process.exit(1)
}
const heldBack = [...held].filter(([family, count]) => reached.has(family) && count > 0).length
/* A scoped run says what it skipped in the same line as its verdict, for the
   reason parity does: a number on its own reads as the whole corpus. */
const verdict = [
  `${fixtures.length} fixtures end in their state from a server's markup and a client's`,
]
if (wantsCorpus) {
  verdict.push(`${clean} examples hydrate to the picture a client renders`)
}
if (heldBack > 0) {
  verdict.push(`${heldBack} known ${heldBack === 1 ? 'family is' : 'families are'} held`)
}
if (skipped.size > 0) {
  verdict.push(`${skipped.size} families the change does not reach were skipped`)
}
console.log(
  `dsd: ${verdict.join(', ')}.${notes}${heldLines.map((line) => `\n    ${line}`).join('')}`,
)
