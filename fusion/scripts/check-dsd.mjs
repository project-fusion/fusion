#!/usr/bin/env bun
/**
 * Whether a component a server rendered still hydrates, and whether one a
 * client rendered renders once.
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
 * **Each fixture is loaded twice in Chromium.** Once as the server's markup,
 * parsed as HTML so its templates become shadow roots, with Lit's hydration
 * support loaded ahead of the components. Once as the bare markup a client
 * renders. Both have to end in the state the fixture names; the server's has to
 * throw nothing, and the client's has to draw no change-in-update warning.
 *
 * **In a browser, never by reading the HTML.** The conventions record a DSD
 * that survived several commits because a string check passed on markup the
 * browser then discarded. So the first thing asked of the server's page is
 * whether each host really has a shadow root before any script has run.
 *
 * The server's markup is rendered in a child process, because Lit's SSR shim
 * patches the globals this process drives the browser with.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    dsd: false,
    markup:
      '<helix-table label="Ways back"><helix-table-column>Option</helix-table-column><helix-table-row><helix-table-cell>Roll back</helix-table-cell></helix-table-row></helix-table>',
    name: 'table',
    reason:
      'it assigns its slots by hand, and a declarative shadow root can only assign them by name',
  },
  {
    check: `const header = host.shadowRoot.querySelector('[part="header"]')
      if (header && getComputedStyle(header).display !== 'none' && !header.hidden) return 'draws a header nobody filled'
      const log = host.shadowRoot.querySelector('slot[name="messages"]')
      return log && log.assignedElements().length === 1 ? null : 'shows ' + (log ? log.assignedElements().length : 'no') + ' turns'`,
    dsd: false,
    markup:
      '<helix-chat label="Support"><helix-chat-message author="them" state="sent">How can I help?</helix-chat-message></helix-chat>',
    name: 'chat',
    reason:
      'it assigns its slots by hand, and a declarative shadow root can only assign them by name',
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

/* The server's markup, from a process of its own. */
if (process.argv.includes('--render')) {
  const { ssr } = await import('@fusion.dev/helix-testing/ssr')
  await import('@fusion.dev/helix')
  const { html } = await import('lit')
  const rendered = FIXTURES.filter((fixture) => fixture.dsd !== false).map((fixture) => ({
    name: fixture.name,
    server: ssr(html(Object.assign([fixture.markup], { raw: [fixture.markup] }))),
  }))
  process.stdout.write(JSON.stringify(rendered))
  process.exit(0)
}

const rendering = Bun.spawnSync(['bun', fileURLToPath(import.meta.url), '--render'], {
  cwd: root,
  stderr: 'pipe',
  stdout: 'pipe',
})
if (rendering.exitCode !== 0) {
  console.error(rendering.stderr.toString())
  throw new Error('dsd: the server render failed, so nothing here was checked')
}
const server = new Map(
  JSON.parse(rendering.stdout.toString()).map((entry) => [entry.name, entry.server]),
)

/* The client: Lit's hydration support ahead of the components, so it has
   patched `LitElement` by the time the first one is defined. The development
   build, because it is the one that warns. */
const work = join(root, '.local/dsd')
await mkdir(work, { recursive: true })
const entry = join(work, 'entry.js')
await writeFile(
  entry,
  "import '@lit-labs/ssr-client/lit-element-hydrate-support.js'\nimport '@fusion.dev/helix'\n",
)
const built = await Bun.build({
  conditions: ['development'],
  entrypoints: [entry],
  target: 'browser',
})
if (!built.success) {
  console.error(built.logs.join('\n'))
  throw new Error('dsd: the client bundle did not build')
}
const bundle = await built.outputs[0].text()

const page = (mode) => {
  const fixtures = FIXTURES.filter((fixture) => mode === 'client' || fixture.dsd !== false)
    .map(
      (fixture) =>
        `<div data-fixture="${fixture.name}">${mode === 'server' ? server.get(fixture.name) : fixture.markup}</div>`,
    )
    .join('\n')
  return `<!doctype html><html><head><meta charset="utf-8"><title>dsd</title></head><body>
${fixtures}
<script>
  window.__parsed = Object.fromEntries(
    [...document.querySelectorAll('[data-fixture]')].map((holder) => [
      holder.dataset.fixture,
      Boolean(holder.firstElementChild && holder.firstElementChild.shadowRoot),
    ]),
  )
</script>
<script type="module" src="/bundle.js"></script>
</body></html>`
}

const serverApp = Bun.serve({
  fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname === '/bundle.js') {
      return new Response(bundle, { headers: { 'content-type': 'text/javascript' } })
    }
    const mode = pathname.slice(1)
    if (mode === 'server' || mode === 'client') {
      return new Response(page(mode), { headers: { 'content-type': 'text/html' } })
    }
    return new Response('not here', { status: 404 })
  },
  port: 0,
})

const { chromium } = await import('playwright')
const browser = await chromium.launch()
const failures = []

for (const mode of ['server', 'client']) {
  const tab = await browser.newPage()
  const errors = []
  const warned = new Set()
  tab.on('pageerror', (error) => errors.push(error.message))
  tab.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error') {
      errors.push(text)
    }
    const twice = /Element (\S+) scheduled an update/.exec(text)
    if (twice) {
      warned.add(twice[1])
    }
  })
  await tab.goto(`http://localhost:${serverApp.port}/${mode}`)
  await tab.evaluate(async () => {
    await customElements.whenDefined('helix-code-block')
    for (let round = 0; round < 6; round += 1) {
      const pending = [...document.querySelectorAll('*')]
        .filter((node) => 'updateComplete' in node)
        .map((node) => node.updateComplete)
      await Promise.allSettled(pending)
      await new Promise((settle) => requestAnimationFrame(() => settle()))
    }
  })
  const parsed = await tab.evaluate(() => window.__parsed)
  const results = await tab.evaluate(
    (fixtures) =>
      fixtures.map(({ check, name }) => {
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
    FIXTURES.filter((fixture) => mode === 'client' || fixture.dsd !== false).map(
      ({ check, name }) => ({ check, name }),
    ),
  )
  for (const { name, problem } of results) {
    if (mode === 'server' && !parsed[name]) {
      failures.push(
        `${name}, from the server: no shadow root before the script ran, so this is not DSD`,
      )
    }
    if (problem) {
      failures.push(
        `${name}, ${mode === 'server' ? 'hydrated' : 'rendered on the client'}: ${problem}`,
      )
    }
  }
  for (const error of errors) {
    failures.push(`${mode === 'server' ? 'hydrating' : 'rendering on the client'}: ${error}`)
  }
  if (mode === 'client') {
    const measuring = new Set(
      FIXTURES.filter((fixture) => fixture.twice).map(
        (fixture) => /^<([a-z-]+)/.exec(fixture.markup)[1],
      ),
    )
    for (const tag of [...warned].filter((one) => !measuring.has(one))) {
      failures.push(
        `${tag}, rendered on the client: rendered twice (Lit's change-in-update warning)`,
      )
    }
  }
  await tab.close()
}

await browser.close()
serverApp.stop()

const skipped = FIXTURES.filter((fixture) => fixture.dsd === false)
const note = [
  ...skipped.map((fixture) => `${fixture.name} was rendered on the client only: ${fixture.reason}`),
  ...FIXTURES.filter((fixture) => fixture.twice).map(
    (fixture) => `${fixture.name} may render twice on the client: ${fixture.twice}`,
  ),
]
  .map((line) => `\n  ${line}`)
  .join('')
if (failures.length > 0) {
  console.error(
    `dsd: ${failures.length} problem(s)\n${failures.map((line) => `  ${line}`).join('\n')}`,
  )
  process.exit(1)
}
console.log(
  `dsd: ${FIXTURES.length - skipped.length} fixtures hydrate from a server's markup, and all ${FIXTURES.length} render on a client as they should.${note}`,
)
