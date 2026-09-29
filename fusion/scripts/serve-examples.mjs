#!/usr/bin/env node
/**
 * Serves every example as a page of its own, for a person with a screen reader.
 *
 * **The component and nothing else on the page.** A reference page shows an
 * example inside a sandboxed frame, under the site's header, navigation and
 * prose, and a screen reader walks all of that before it reaches the example.
 * Here `/dialog/persistent` is the example alone, so what the reader hears is
 * what the component says. `.github/SCREEN-READER.md` is the script that
 * uses it.
 *
 * **The real frame and its real bundle**, as `run-example-smoke.mjs` uses
 * them: `frame.html` is served as the page, and the page sends the example to
 * itself with the same message the sandbox sends. The frame takes a message
 * from its parent window only, and a page's parent is the page itself.
 *
 * `?mode=dark` renders the example in the dark color mode. Run with
 * `bun run serve:examples`, after which the address is printed. `--port` picks
 * the port, 4180 by default.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'

const frame = join(root, 'fusion/site/public/sandbox')
const fonts = join(root, 'fusion/site/public/fonts')
const source = join(root, SOURCE.styled)

const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
}

const at = process.argv.indexOf('--port')
const port = at === -1 ? 4180 : Number(process.argv[at + 1])

/** Every family's examples, by slug, read once at start. */
const families = new Map()
for (const family of readdirSync(source).sort()) {
  let entries = []
  try {
    entries = readdirSync(join(source, family, '.examples'))
  } catch {
    continue
  }
  const slugs = entries
    .filter((entry) => entry.endsWith('.html'))
    .map((entry) => entry.replace(/\.html$/, ''))
    .sort()
  if (slugs.length > 0) {
    families.set(family, slugs)
  }
}

/** A family's name as the site writes it: `data-table` is Data Table. */
const nameOf = (family) =>
  family
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

/** Text for HTML, where the example's names are the only text written. */
const escaped = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const index = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Helix examples</title>
  </head>
  <body>
    <main>
      <h1>Helix examples</h1>
      ${[...families]
        .map(
          ([family, slugs]) => `<h2>${escaped(nameOf(family))}</h2>
      <ul>${slugs.map((slug) => `<li><a href="/${family}/${slug}">${escaped(slug)}</a></li>`).join('')}</ul>`,
        )
        .join('\n      ')}
    </main>
  </body>
</html>`

/**
 * The frame's own document with the example sent to it.
 *
 * **A module script, so it runs after `frame.js`**, which is deferred: the two
 * run in document order once the document is parsed, and the frame's listener
 * is there before the message is. The payload is JSON with every `<` escaped,
 * so an example holding `</script>` cannot end the script it travels in.
 */
const page = (family, slug, dark) => {
  const base = join(source, family, '.examples', slug)
  let styles = ''
  try {
    styles = readFileSync(`${base}.css`, 'utf8')
  } catch {
    styles = ''
  }
  const message = {
    ...(dark ? { colorMode: 'dark' } : {}),
    layout: 'padded',
    source: readFileSync(`${base}.html`, 'utf8'),
    styles,
    type: 'helix-preview-render',
  }
  const payload = JSON.stringify(message).replace(/</g, '\\u003c')
  return readFileSync(join(frame, 'frame.html'), 'utf8')
    .replace('<head>', '<head>\n    <base href="/" />')
    .replace(/<title>[^<]*<\/title>/, `<title>${escaped(`${nameOf(family)}: ${slug}`)}</title>`)
    .replace(
      '</body>',
      `  <script type="module">window.postMessage(${payload}, '*')</script>\n  </body>`,
    )
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const [family, slug, extra] = url.pathname.split('/').filter(Boolean)
  const send = (status, type, body) => {
    response.writeHead(status, { 'content-type': type })
    response.end(body)
  }
  if (!family) {
    return send(200, 'text/html', index())
  }
  /* The faces the frame's stylesheet names, which live with the site's. */
  if (family === 'fonts' && slug && !extra && /^[\w.-]+$/.test(slug)) {
    try {
      return send(200, TYPES[extname(slug)] ?? 'text/plain', readFileSync(join(fonts, slug)))
    } catch {
      return send(404, 'text/plain', 'Not found')
    }
  }
  if (slug && !extra && families.get(family)?.includes(slug)) {
    return send(200, 'text/html', page(family, slug, url.searchParams.get('mode') === 'dark'))
  }
  /* The frame's own files, which a page asks for from the root its `<base>` names. */
  if (!slug && /^[\w.-]+$/.test(family)) {
    try {
      return send(200, TYPES[extname(family)] ?? 'text/plain', readFileSync(join(frame, family)))
    } catch {
      return send(404, 'text/plain', 'Not found')
    }
  }
  return send(404, 'text/plain', 'Not found')
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Helix examples: http://127.0.0.1:${port}/`)
})
