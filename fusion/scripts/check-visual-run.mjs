#!/usr/bin/env node
/**
 * Runs `helix visual` in a real browser against a small server with each fault
 * planted, and holds it to what it says.
 *
 * **Each fault here passed once, on BlocNav, on October 30, 2026.** A page that
 * answered 500 became three blank baselines and exit 0. A map drawn late was
 * pictured empty with a green run, and nothing named the requests that were
 * refused. A mask on a host with `display: contents` painted nothing and said
 * nothing. Only a browser shows these: the answer of a real navigation, a real
 * box, and what the route handler really refused.
 *
 * The config is plain JavaScript in a scratch directory, so the check reads as
 * a consumer's run: nothing here is the repository's own.
 *
 * Run with `bun run check:spec:visual-run`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leave } from '@fusion.dev/scripts/leave'
import { root } from '@fusion.dev/scripts/workspace'

const document = (body) =>
  `<!doctype html><html lang="en"><title>Page</title><body>${body}</body></html>`

const PAGES = {
  '/broken': { body: document('<p>Internal server error</p>'), status: 500 },
  '/busy': {
    body: document(`<script>
      document.body.dataset.ready = ''
      for (const end = Date.now() + 3000; Date.now() < end; );
    </script><p>Busy</p>`),
  },
  '/declared': {
    body: document(
      '<x-declared><template shadowrootmode="open"><p>Declared</p></template></x-declared>',
    ),
  },
  '/font-local': {
    body: document(`<style>
      @font-face { font-family: "Only Local"; src: local("No Such Font Anywhere"); }
      p { font-family: "Only Local", sans-serif; }
    </style><p>A fallback the machine does not have</p>`),
  },
  '/font-missing': {
    body: document(`<style>
      @font-face { font-family: "Not There"; src: url("/no-such-font.woff2") format("woff2"); }
      p { font-family: "Not There", sans-serif; }
    </style><p>A file that does not load</p>`),
  },
  '/gone': { body: document('<h1>Not found</h1>'), status: 404 },
  '/late': {
    body: document(
      `<main>Drawing</main><script>setTimeout(() => {
        document.querySelector('main').textContent = 'Drawn'
        document.body.dataset.ready = ''
      }, 300)</script>`,
    ),
  },
  '/masked': {
    body: document(
      '<div id="contents" style="display: contents"><p>Inside</p></div><p id="shown">Shown</p>',
    ),
  },
  '/plain': {
    body: document(
      `<p>Plain</p><script>
        const host = document.createElement('x-plain-host')
        host.attachShadow({ mode: 'open' }).innerHTML = '<p>In a shadow root</p>'
        document.body.append(host)
      </script>`,
    ),
  },
  '/requests': {
    body: document(
      '<img alt="" src="http://tiles.invalid/refused.png"><img alt="" src="http://allowed.invalid/allowed.png"><p>Requests</p>',
    ),
  },
  '/slow-ready': {
    body: document(`<x-never></x-never><script>
      customElements.define('x-never', class extends HTMLElement {
        whenDrawn = new Promise(() => {})
      })
    </script>`),
  },
  '/turns': { body: document('<p>Fine for now</p>') },
  '/unknown': { body: document('<x-unknown>Unknown</x-unknown>') },
}

const server = createServer((request, response) => {
  const page = PAGES[new URL(request.url, 'http://check').pathname]
  response.writeHead(page?.status ?? (page ? 200 : 404), { 'content-type': 'text/html' })
  response.end(page?.body ?? '')
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const url = `http://127.0.0.1:${server.address().port}`

const failures = []
const expect = (what, held, shown) => {
  if (!held) {
    failures.push(`${what}${shown === undefined ? '' : `\n    ${String(shown).slice(-600)}`}`)
  }
}

const scratch = mkdtempSync(join(tmpdir(), 'helix-visual-run-'))

/**
 * One `helix visual` of `routes` under `settings`, in a scratch directory of its
 * own: its code, what it printed, and the record it left. One shot, and one
 * source, since each fault is about the page and not about the shot.
 */
const run = async (name, verb, routes, settings = {}) => {
  const at = join(scratch, name)
  mkdirSync(at, { recursive: true })
  const config = join(at, 'visual.config.mjs')
  writeFileSync(
    config,
    `export default ${JSON.stringify({
      platform: 'any',
      shots: [{ name: 'wide', scheme: 'light', width: 640 }],
      sources: [{ baselines: 'baselines', kind: 'server', name: 'site', routes, url }],
      ...settings,
    })}`,
  )
  /* Not a blocking spawn, since this process serves the pages the child asks
     for. */
  const ran = await new Promise((done) => {
    const child = Bun.spawn(
      [process.execPath, join(root, 'helix/cli/npm/bin.mjs'), 'visual', verb, '--config', config],
      { cwd: at, stderr: 'pipe', stdout: 'pipe' },
    )
    Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]).then(([stdout, stderr, code]) => done({ code, said: stdout + stderr }))
  })
  const record = join(at, '.helix/visual/run.json')
  return {
    ...ran,
    at,
    record: existsSync(record) ? JSON.parse(readFileSync(record, 'utf8')) : {},
  }
}

const baseline = (one, name) => existsSync(join(one.at, `baselines/${name}.wide.png`))

/* A page that answers an error is no page to take a baseline of. */
{
  const update = await run('error-update', 'update', ['/broken'])
  expect('update fails on a page that answers 500', update.code === 1, update.said)
  expect('update names the status', update.said.includes('answered 500'), update.said)
  expect('update writes no baseline of it', !baseline(update, 'broken'))
  await run('error-test', 'update', ['/turns'])
  PAGES['/turns'].status = 500
  const test = await run('error-test', 'test', ['/turns'])
  expect('test fails on a page that came to answer 500', test.code === 1, test.said)
  expect('test names the status', test.said.includes('answered 500'), test.said)
  expect('test says it could not take it', test.said.includes('could not be taken'), test.said)
  expect('test offers no retake of it', !test.said.includes('retake the baselines'), test.said)
  const gone = await run('error-named', 'update', [{ name: 'gone', path: '/gone', status: 404 }])
  expect('a route that names its status is pictured', gone.code === 0, gone.said)
  expect('and has its baseline', baseline(gone, 'gone'))
  const moved = await run('error-wrong', 'update', [{ name: 'late', path: '/late', status: 404 }])
  expect('a route that answers another status fails', moved.code === 1, moved.said)
}

/* A face with nothing to download is no failed download. */
{
  const local = await run('font-local', 'update', ['/font-local'])
  expect('a face with only local sources does not fail the entry', local.code === 0, local.said)
  const missing = await run('font-missing', 'update', ['/font-missing'])
  expect('a face whose file does not load fails it', missing.code === 1, missing.said)
  expect('and names the face', missing.said.includes('Not There'), missing.said)
}

/* An update's report shows what it wrote. */
{
  const update = await run('report', 'update', [{ name: 'late', path: '/late' }])
  const shot = update.record.shots?.[0]
  expect(
    'an update names the picture it wrote',
    shot?.baseline === 'shots/0-baseline.png',
    update.said,
  )
  expect(
    'and leaves it in the report',
    existsSync(join(update.at, '.helix/visual/shots/0-baseline.png')),
  )
  const page = readFileSync(join(update.at, '.helix/visual/index.html'), 'utf8')
  expect(
    'and shows it on the page',
    page.includes('src="shots/0-baseline.png"'),
    page.slice(0, 200),
  )
}

/* What a page draws late is waited for, and giving up says so. */
{
  const late = await run('selector', 'update', [{ path: '/late', selector: '[data-ready]' }])
  expect('a selector that arrives is waited for', late.code === 0, late.said)
  const drawn = await run('selector-global', 'update', ['/late'], {
    settle: { selector: '[data-ready]' },
  })
  expect('the config can name it for every entry', drawn.code === 0, drawn.said)
  const never = await run('selector-never', 'update', ['/masked'], {
    settle: { selector: '[data-ready]', timeout: 1 },
  })
  expect('a selector that never arrives fails the entry', never.code === 1, never.said)
  expect(
    'and names the selector',
    never.said.includes('`[data-ready]` matched nothing after 1 seconds'),
    never.said,
  )
  expect('and writes no baseline', !baseline(never, 'masked'))
  const busy = await run('selector-busy', 'update', ['/busy'], {
    settle: { selector: '[data-ready]', timeout: 1 },
  })
  expect('a page too busy to answer in time is not given up on', busy.code === 0, busy.said)
  const slow = await run('ready', 'update', ['/slow-ready'], {
    settle: { readyProperty: 'whenDrawn' },
  })
  expect(
    'a ready promise that never resolves is named',
    slow.record.notices?.some((one) => one.includes('x-never')),
    slow.said,
  )
}

/* What the run refused is said, in the log and in the record. */
{
  const origin = await run('refused', 'update', ['/requests'])
  const hosts = origin.record.refused?.['site/requests']?.map((one) => one.host) ?? []
  expect(
    'the record names the hosts it refused',
    hosts.includes('tiles.invalid') && hosts.includes('allowed.invalid'),
    JSON.stringify(origin.record.refused),
  )
  expect('the log names them', origin.said.includes('tiles.invalid (1)'), origin.said)
  const allowed = await run('allowed', 'update', ['/requests'], {
    network: { allow: ['allowed.invalid'] },
  })
  const left = allowed.record.refused?.['site/requests']?.map((one) => one.host) ?? []
  expect(
    'an allowed host is not refused',
    left.includes('tiles.invalid') && !left.includes('allowed.invalid'),
    JSON.stringify(allowed.record.refused),
  )
}

/* A mask that paints nothing is said. */
{
  const masked = await run('masks', 'update', ['/masked'], {
    mask: ['#contents', '#absent', '#shown'],
  })
  const notices = masked.record.notices ?? []
  expect(
    'a mask on a host with no box is named',
    notices.some((one) => one.includes('`#contents` matches only elements with no box')),
    masked.said,
  )
  expect(
    'a mask that matches nothing is named',
    notices.some((one) => one.includes('`#absent` matches nothing')),
    masked.said,
  )
  expect('a mask that paints is not', !notices.some((one) => one.includes('#shown')), masked.said)
}

/* A tag a script made a plain host waits for no definition. A tag nothing
   defines fails, whether or not its HTML gave it a shadow root. */
{
  const plain = await run('plain', 'update', ['/plain'])
  expect('a plain host does not fail the entry', plain.code === 0, plain.said)
  const unknown = await run('unknown', 'update', ['/unknown', '/declared'], {
    settle: {},
  })
  expect('a tag nothing defines fails', unknown.code === 1, unknown.said)
  expect('and names the tag', unknown.said.includes('<x-unknown>'), unknown.said)
  expect(
    'and a declared shadow root does not excuse it',
    unknown.said.includes('<x-declared>'),
    unknown.said,
  )
  expect('and names the setting', unknown.said.includes('`settle.elements`'), unknown.said)
}

server.close()
rmSync(scratch, { force: true, recursive: true })

if (failures.length > 0) {
  console.error(`visual run: ${failures.length} failed:\n\n  ${failures.join('\n  ')}`)
  await leave(1)
} else {
  console.log(
    `visual run: every planted fault was reported, in ${Object.keys(PAGES).length} pages.`,
  )
  await leave(0)
}
