#!/usr/bin/env bun
/**
 * Scaffolds every template with `helix new`, installs it from freshly packed
 * tarballs, runs its own `build`, and holds what each one renders to React on
 * Vite's.
 *
 * **`smoke:template` asks whether the packages install; this asks whether a
 * project does.** A template carries dependencies of its own, a framework, a
 * bundler and a TypeScript, and nothing else here installs them, so a template
 * could ship not building while every check passed. Measured on 14 Sep 2026:
 * the Next.js template imported `./helix-elements.js`, which Turbopack does not
 * map back to `.tsx`, and neither template declared `@types/react`, so both
 * failed their first `build` on a fresh project and had since they were
 * written. A dependency bot bumping a template's framework was reviewed against
 * a green CI that had never built one.
 *
 * **Through `helix new`, not a copy.** The scaffolder is what a consumer runs,
 * and it is the part that fills the placeholders, so copying the directory would
 * test a project nobody gets.
 *
 * **Every published package is packed and every one is an override**, so the
 * `@fusion.dev` dependencies a template names, and the ones they name in turn,
 * resolve to this tree rather than to a registry holding an older version or
 * none at all. The framework and its tooling come from the registry, which is
 * the point: they are what a bump changes.
 *
 * **Then the same three pages, compared.** Every template lays down the same
 * pages, each written by hand in its own framework, so each built template is
 * served, opened in Chromium, and compared with React on Vite route by route:
 *
 * - **The markup**: every element under `.shell`, with its attributes and its
 *   text. A Helix element's own attributes are compared as the properties they
 *   set. React sets a property where Angular and Solid write the attribute, and
 *   the element holds the same value either way.
 * - **The picture**: the full page at 1280 and at 390, and at 1280 in dark,
 *   pixel for pixel, taken again before a difference is reported.
 *
 * Each template names the words that are its own, such as its framework's name
 * and docs page in the footer, and they are swapped for React's before either
 * comparison. Nothing else may differ.
 *
 * Run `bun run build` and `bun run analyze` first; the tarballs are packed from
 * `dist`.
 *
 *   bun fusion/scripts/run-template-build.mjs              every template
 *   bun fusion/scripts/run-template-build.mjs vue-vite     one, and React on Vite to hold it to
 */
import { execFileSync, spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, relative } from 'node:path'
import { awaitStill, awaitUpgrades } from '@fusion.dev/scripts/settle'
import { manifests, publishes, root } from '@fusion.dev/scripts/workspace'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

/** The template every other one is held to. */
const REFERENCE = 'react-vite'

const only = process.argv.slice(2).find((argument) => !argument.startsWith('--'))

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const scratch = mkdtempSync(join(tmpdir(), 'helix-scaffold-'))
const tarballs = join(scratch, 'tarballs')
mkdirSync(tarballs)

/* A platform package holds a binary the release places, so there is nothing in
   it to pack and nothing a template imports. */
const overrides = {}
for (const [name, { directory, manifest }] of manifests()) {
  if (!name.startsWith('@fusion.dev/') || !publishes(manifest) || manifest.os !== undefined) {
    continue
  }
  const into = join(tarballs, name.replace('@', '').replace('/', '-'))
  mkdirSync(into)
  run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  const [file] = readdirSync(into)
  overrides[name] = `file:${join(into, file)}`
}

const register = JSON.parse(readFileSync(join(root, 'helix/templates/templates.json'), 'utf8'))
const named = register.templates.map((one) => one.id)
if (only !== undefined && !named.includes(only)) {
  console.error(`templates: no template called \`${only}\`.`)
  process.exit(1)
}
/* One template asked for is built beside the one it is held to. */
const templates = named.filter(
  (id) => only === undefined || id === only || (id === REFERENCE && only !== REFERENCE),
)

const failed = []
/** Each template that built, by id, and where its project is. */
const built = new Map()
for (const id of templates) {
  const project = join(scratch, id)
  run('bun', ['run', 'helix', 'new', 'meridian', '--template', id, '--into', project], root)

  const file = join(project, 'package.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  for (const section of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (overrides[name] !== undefined) {
        manifest[section][name] = overrides[name]
      }
    }
  }
  manifest.overrides = overrides
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)

  try {
    run('bun', ['install'], project)
    run('bun', ['run', 'build'], project)
    built.set(id, project)
    console.log(`  ${id}: installed and built`)
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').slice(-12)
    failed.push(`${id}\n    ${output.join('\n    ')}`)
    console.error(`  ${id}: failed`)
  }
}

if (failed.length > 0) {
  console.error(`\ntemplates: ${failed.length} did not build.\n\n  ${failed.join('\n\n  ')}\n`)
  process.exit(1)
}
console.log(
  `templates: ${templates.length} scaffolded by \`helix new\`, installed from packed tarballs, and built`,
)

/* ---------------------------------------------------------------- parity */

/** The three pages, as each template's router names them. */
const ROUTES = ['/', '/overview', '/join']

/** The pictures taken of each route. */
const SHOTS = [
  { colorScheme: 'light', height: 900, name: '1280', width: 1280 },
  { colorScheme: 'light', height: 844, name: '390', width: 390 },
  { colorScheme: 'dark', height: 900, name: '1280 dark', width: 1280 },
]

/**
 * A template's words for its framework, and React on Vite's for the same
 * places: the footer's last link, and the entry file the landing page names.
 * The docs address is written out whole, so `fusion prose` can check it.
 */
const framework = (name, docs, entry) => ({
  text: [[name, 'React'], ...(entry ? [[entry, 'src/main.tsx']] : [])],
  values: [[docs, 'https://fusion.dev/helix/docs/react']],
})

/**
 * How each template is served and addressed, and what is its own.
 *
 * - `served`: the built directory, served as files; `started`: a server the
 *   project starts itself.
 * - `paths`: the routes are paths, where the others put them in the hash.
 * - `ignore`: attributes the framework writes for itself. Angular marks each
 *   element a component is selected by, here `app-landing` and the rest.
 * - `hosts`: elements a framework adds that draw nothing, here Angular's
 *   `app-site-header`, which is `display: contents`. The record steps through
 *   them to what they hold.
 * - `text` and `values`: the template's own words, in text and in attribute
 *   values, each with React on Vite's in its place.
 */
const PARITY = {
  angular: {
    hosts: '^app-site-header$',
    ignore: '^app-',
    served: 'dist/browser',
    ...framework('Angular', 'https://fusion.dev/helix/docs/angular', 'src/main.ts'),
  },
  'react-nextjs': {
    paths: true,
    started: ['run', 'start', '--', '--port'],
    text: [
      ['app/app.css', 'src/app.css'],
      ['app/helix-elements.tsx', 'src/main.tsx'],
    ],
    values: [
      ['/', '#/'],
      ['/join', '#/join'],
      ['/overview', '#/overview'],
    ],
  },
  'react-vite': { served: 'dist' },
  'solid-vite': {
    served: 'dist',
    ...framework('Solid', 'https://fusion.dev/helix/docs/other-frameworks'),
  },
  'svelte-vite': {
    served: 'dist',
    ...framework('Svelte', 'https://fusion.dev/helix/docs/svelte', 'src/main.ts'),
  },
  'vue-vite': {
    served: 'dist',
    ...framework('Vue', 'https://fusion.dev/helix/docs/vue', 'src/main.ts'),
  },
}

const unlisted = [...built.keys()].filter((id) => PARITY[id] === undefined)
if (unlisted.length > 0) {
  console.error(
    `\ntemplates: ${unlisted.join(', ')} not in PARITY in run-template-build.mjs, so nothing says how to serve it or which words are its own.`,
  )
  process.exit(1)
}

/**
 * Each Helix tag's attributes and the properties they set, and its public
 * properties that no attribute sets, such as `rows`, read from the manifest
 * the styled tier publishes.
 */
const FIELDS = (() => {
  const manifest = JSON.parse(readFileSync(join(root, 'helix/styled/custom-elements.json'), 'utf8'))
  const fields = {}
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName) {
        continue
      }
      const pairs = (declaration.attributes ?? [])
        .filter((one) => one.fieldName)
        .map((one) => [one.name, one.fieldName])
      const set = new Set(pairs.map(([, field]) => field))
      const properties = (declaration.members ?? [])
        .filter(
          (one) =>
            one.kind === 'field' &&
            !one.static &&
            !one.readonly &&
            (one.privacy ?? 'public') === 'public' &&
            !set.has(one.name),
        )
        .map((one) => [null, one.name])
      fields[declaration.tagName] = [...pairs, ...properties]
    }
  }
  return fields
})()

const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

/** A free port, from the system. */
const freePort = () =>
  new Promise((done) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => done(port))
    })
  })

/** Serves a template, and says where. Files with a fallback to the page, or the project's own server. */
const serve = async (id, project) => {
  const how = PARITY[id]
  if (how.served) {
    const directory = join(project, how.served)
    const server = createServer((request, response) => {
      let file = join(directory, decodeURIComponent(new URL(request.url, 'http://x').pathname))
      if (!existsSync(file) || statSync(file).isDirectory()) {
        file = join(directory, 'index.html')
      }
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      })
      response.end(readFileSync(file))
    })
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    return { origin: `http://127.0.0.1:${server.address().port}`, stop: () => server.close() }
  }
  const port = await freePort()
  const child = spawn('bun', [...how.started, String(port)], { cwd: project, stdio: 'ignore' })
  const origin = `http://127.0.0.1:${port}`
  for (let waited = 0; ; waited += 250) {
    try {
      if ((await fetch(origin)).ok) {
        break
      }
    } catch {
      /* Not listening yet. */
    }
    if (waited > 30_000) {
      child.kill()
      throw new Error(`${id} did not answer on ${origin} within thirty seconds.`)
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  return { origin, stop: () => child.kill() }
}

/** A route's address in a template. */
const address = (id, origin, route) =>
  PARITY[id].paths ? `${origin}${route}` : route === '/' ? `${origin}/` : `${origin}/#${route}`

/**
 * The page's markup under `.shell`, in a form two frameworks can agree on.
 *
 * Runs in the page, after `normalize`. Adjacent text is one run, collapsed and
 * trimmed, since React writes `{count} people` as two text nodes. A `data-*`
 * attribute React writes as `"true"` is present, as an empty one is.
 */
const recordOf = ({ fields, hosts, ignore }) => {
  const ignored = ignore ? new RegExp(ignore) : null
  const stepped = hosts ? new RegExp(hosts) : null
  const sorted = (entries) => Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : 1)))
  const serialized = (value) =>
    value !== null && typeof value === 'object' ? JSON.stringify(value) : value
  const visit = (element) => {
    const declared = fields[element.localName] ?? []
    const own = new Set(declared.map(([attribute]) => attribute).filter(Boolean))
    const attributes = []
    for (const { name, value } of element.attributes) {
      if (own.has(name) || ignored?.test(name)) {
        continue
      }
      attributes.push([name, name.startsWith('data-') && value === 'true' ? '' : value])
    }
    const state = []
    for (const [attribute, field] of declared) {
      const value = element[field]
      if (value !== undefined && typeof value !== 'function') {
        state.push([attribute ?? `.${field}`, serialized(value)])
      }
    }
    const children = []
    let run = ''
    const flush = () => {
      const one = run.replace(/\s+/g, ' ').trim()
      if (one) {
        children.push(one)
      }
      run = ''
    }
    const gather = (parent) => {
      for (const node of parent.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          run += node.data
        } else if (node.nodeType === Node.ELEMENT_NODE && stepped?.test(node.localName)) {
          gather(node)
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          flush()
          children.push(visit(node))
        }
      }
    }
    gather(element)
    flush()
    return {
      attributes: sorted(attributes),
      children,
      state: sorted(state),
      tag: element.localName,
    }
  }
  const shell = document.querySelector('.shell')
  return shell ? visit(shell) : null
}

/**
 * Puts React on Vite's words in the page in place of the template's own, and
 * makes each run of text one node, before a picture.
 *
 * **One node a run, because Chromium measures a run node by node.** React
 * writes `{count} people` and `{' '}` as text nodes of their own, and each is
 * rounded on its own, so the page around them came out 1/64 of a pixel narrower
 * than Vue's, and every glyph to its right was drawn a fraction over. Measured
 * on the overview: `.page` 866.921875 wide in React and 866.90625 in Vue, and
 * 1,020 pixels apart. With the runs merged, both are 866.90625 and the pictures
 * match. The comments a framework leaves between nodes go first, so the runs
 * either side of one meet.
 */
const normalize = ({ text, values }) => {
  const comments = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
  const found = []
  for (let node = comments.nextNode(); node; node = comments.nextNode()) {
    found.push(node)
  }
  for (const node of found) {
    node.remove()
  }
  document.body.normalize()
  const words = new Map(text)
  const swapped = new Map(values)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const trimmed = node.data.trim()
    if (words.has(trimmed)) {
      node.data = node.data.replace(trimmed, words.get(trimmed))
    }
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const { name, value } of [...element.attributes]) {
      if (swapped.has(value)) {
        element.setAttribute(name, swapped.get(value))
      }
    }
  }
}

/** Where two records first part, as a path and what each side holds there. */
const differences = (ours, theirs, path = '') => {
  if (ours === null || theirs === null) {
    return [
      `no \`.shell\` on the page${ours === null ? ' in React on Vite' : ''}${theirs === null && ours === null ? ' or' : ''}${theirs === null ? ' in this template' : ''}`,
    ]
  }
  if (typeof ours === 'string' || typeof theirs === 'string') {
    return ours === theirs
      ? []
      : [`${path}: the text "${theirs}", where React on Vite has "${ours}"`]
  }
  const label = theirs.attributes.class
    ? `${theirs.tag}.${theirs.attributes.class.trim().split(/\s+/).join('.')}`
    : theirs.tag
  const here = path ? `${path} > ${label}` : label
  if (ours.tag !== theirs.tag) {
    return [`${path}: <${theirs.tag}>, where React on Vite has <${ours.tag}>`]
  }
  const found = []
  for (const kind of ['attributes', 'state']) {
    const keys = new Set([...Object.keys(ours[kind]), ...Object.keys(theirs[kind])])
    for (const key of keys) {
      const a = JSON.stringify(ours[kind][key])
      const b = JSON.stringify(theirs[kind][key])
      if (a !== b) {
        found.push(`${here}: ${key} is ${b ?? 'unset'}, where React on Vite has ${a ?? 'unset'}`)
      }
    }
  }
  if (ours.children.length !== theirs.children.length) {
    const tags = (one) =>
      one.children.map((child) => (typeof child === 'string' ? '"…"' : child.tag))
    found.push(
      `${here}: ${theirs.children.length} children (${tags(theirs).join(', ')}), where React on Vite has ${ours.children.length} (${tags(ours).join(', ')})`,
    )
    return found
  }
  ours.children.forEach((child, at) => {
    found.push(...differences(child, theirs.children[at], here))
  })
  return found
}

/** Where a difference's picture is written, to be looked at. */
const DIFFS = join(root, '.local/template-parity')

const browser = await chromium.launch()

/** Opens a route at one size and scheme, settled, and what the page threw on the way. */
const open = async (url, shot) => {
  const tab = await browser.newPage({
    colorScheme: shot.colorScheme,
    viewport: { height: shot.height, width: shot.width },
  })
  const thrown = []
  tab.on('pageerror', (error) => thrown.push(String(error)))
  await tab.goto(url, { waitUntil: 'load' })
  const undefinedTags = await awaitUpgrades(tab, 'helix-')
  await awaitStill(tab)
  return { tab, thrown, undefinedTags }
}

/** The template's own words, with React on Vite's in their place. */
const wordsOf = (id) => ({ text: PARITY[id].text ?? [], values: PARITY[id].values ?? [] })

/** One picture of a route, with React on Vite's words in the page. */
const picture = async (id, url, shot) => {
  const opened = await open(url, shot)
  await opened.tab.evaluate(normalize, wordsOf(id))
  await awaitStill(opened.tab)
  return {
    ...opened,
    shot: await opened.tab.screenshot({ animations: 'disabled', fullPage: true }),
  }
}

/** Every route's record and pictures for one template, served at `origin`. */
const take = async (id, origin) => {
  const routes = {}
  for (const route of ROUTES) {
    const url = address(id, origin, route)
    const taken = { problems: [], record: null, shots: {}, url }
    for (const shot of SHOTS) {
      const { shot: png, tab, thrown, undefinedTags } = await picture(id, url, shot)
      if (shot === SHOTS[0]) {
        taken.record = await tab.evaluate(recordOf, {
          fields: FIELDS,
          hosts: PARITY[id].hosts ?? null,
          ignore: PARITY[id].ignore ?? null,
        })
        if (undefinedTags.length > 0) {
          taken.problems.push(`${undefinedTags.join(', ')} never defined`)
        }
      }
      taken.problems.push(...thrown.map((error) => `the page threw: ${error}`))
      taken.shots[shot.name] = png
      await tab.close()
    }
    routes[route] = taken
  }
  return routes
}

/** How many pixels two pictures differ by, and the marked difference. */
const compare = (a, b) => {
  const ours = PNG.sync.read(a)
  const theirs = PNG.sync.read(b)
  if (ours.width !== theirs.width || ours.height !== theirs.height) {
    return {
      size: `${theirs.width}x${theirs.height}, where React on Vite is ${ours.width}x${ours.height}`,
    }
  }
  const diff = new PNG({ height: ours.height, width: ours.width })
  const moved = pixelmatch(ours.data, theirs.data, diff.data, ours.width, ours.height, {
    threshold: 0.1,
  })
  return { diff, moved }
}

const findings = []
if (built.has(REFERENCE) && built.size > 1) {
  rmSync(DIFFS, { force: true, recursive: true })
  const served = await serve(REFERENCE, built.get(REFERENCE))
  const reference = await take(REFERENCE, served.origin).finally(served.stop)
  for (const route of ROUTES) {
    findings.push(...reference[route].problems.map((one) => `${REFERENCE} ${route}: ${one}`))
  }
  for (const id of built.keys()) {
    if (id === REFERENCE) {
      continue
    }
    const server = await serve(id, built.get(id))
    const theirs = await take(id, server.origin)
    let differed = 0
    for (const route of ROUTES) {
      const ours = reference[route]
      const one = theirs[route]
      findings.push(...one.problems.map((problem) => `${id} ${route}: ${problem}`))
      const parted = differences(ours.record, one.record)
      if (parted.length > 0) {
        differed += 1
        findings.push(
          `${id} ${route}: the markup differs from React on Vite's.\n      ${parted.slice(0, 6).join('\n      ')}` +
            (parted.length > 6 ? `\n      and ${parted.length - 6} more` : ''),
        )
      }
      for (const shot of SHOTS) {
        let result = compare(ours.shots[shot.name], one.shots[shot.name])
        if (result.moved > 0) {
          /* **A real difference reproduces and a flake does not**, so a
             picture that differs is taken again before it is reported. */
          const again = await picture(id, one.url, shot)
          result = compare(ours.shots[shot.name], again.shot)
          await again.tab.close()
        }
        if (result.size) {
          differed += 1
          findings.push(`${id} ${route} at ${shot.name}: the page is ${result.size}.`)
        } else if (result.moved > 0) {
          differed += 1
          mkdirSync(DIFFS, { recursive: true })
          const file = join(
            DIFFS,
            `${id}${route.replaceAll('/', '-') || '-'}-${shot.name.replace(' ', '-')}.png`,
          )
          writeFileSync(file, PNG.sync.write(result.diff))
          findings.push(
            `${id} ${route} at ${shot.name}: ${result.moved} pixels differ from React on Vite. The marked difference is at ${relative(root, file)}.`,
          )
        }
      }
    }
    server.stop()
    console.log(`  ${id}: ${differed === 0 ? 'renders as React on Vite does' : 'differs'}`)
  }
}
await browser.close()

if (findings.length > 0) {
  console.error(`\ntemplates: ${findings.length} differences.\n\n  ${findings.join('\n\n  ')}\n`)
  process.exit(1)
}
if (built.has(REFERENCE) && built.size > 1) {
  console.log(
    `templates: ${built.size - 1} held to React on Vite on ${ROUTES.length} routes, in markup and in ${SHOTS.length} pictures each`,
  )
}
