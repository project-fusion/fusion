/**
 * The parity config for this repository: every Helix example written in both HTML and
 * TSX, pictured from each and compared with itself.
 *
 * **No baseline, and that is the interesting difference from the visual
 * check.** Both sides render on one machine seconds apart, so the platform
 * cancels out: it runs anywhere, and nothing it pictures is committed. What it
 * asks is whether the two syntaxes an example is published in draw the same
 * thing, which is a question the sandbox has always been asked and that
 * nothing else here answers.
 *
 * **Both sides render from `frame.js`**, the bundle `turbo run frame` writes,
 * so a component change reaches neither until that has run. `prepare` refuses
 * a bundle older than the components it bundles: re-run against a stale one,
 * a fix still reports its full pixel count and reads as not having worked.
 *
 * **The React side is built here, with Bun**, one module per example that
 * renders its `Example` into a `#root` with `display: contents`, so React's
 * mount point adds no box the HTML side lacks. A stylesheet an example imports
 * resolves to nothing: both sides link the same file, and the way a stylesheet
 * arrives is the one thing that has to be identical for the comparison to mean
 * anything.
 *
 * **Scoped by what a change reaches**, when `--changed` names a base: a
 * family's own files, the families that render it in their shadow roots, and
 * the whole corpus for a path every example reads. `@fusion.dev/scripts/scope`
 * holds the rule, which `plan-browser.mjs` sizes the shards by too.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from '@fusion.dev/helix-cli/visual'
import { ESTIMATE, measured } from '@fusion.dev/scripts/cost'
import { OWN, scopeFor } from '@fusion.dev/scripts/scope'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'

const TIERS = [
  { name: 'headless', sheet: false, source: join(root, SOURCE.headless) },
  { name: 'styled', sheet: true, source: join(root, SOURCE.styled) },
]
const FRAME = join(root, 'fusion/site/public/sandbox/frame.js')
const BUILT = join(root, '.local/parity')

/** A file a person edits: a component's source or its stylesheet, never a spec or a generated sheet. */
const authored = (name: string) =>
  !name.includes('.spec.') &&
  !name.endsWith('.css.ts') &&
  (name.endsWith('.ts') || name.endsWith('.css'))

/** The newest authored file under `dir`, as an mtime. */
const newest = (dir: string) => {
  let latest = 0
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && authored(entry.name)) {
      latest = Math.max(latest, statSync(join(entry.parentPath, entry.name)).mtimeMs)
    }
  }
  return latest
}

/** An example's stylesheet import, resolved to an empty module. */
const stubStylesheets = {
  name: 'stub-stylesheets',
  setup(build: Bun.PluginBuilder) {
    build.onResolve({ filter: /\.css$/ }, (one) => ({ namespace: 'stub', path: one.path }))
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' }))
  },
}

const prepare = async ({ changed }: { changed?: string }) => {
  if (!existsSync(FRAME)) {
    throw new Error('fusion/site/public/sandbox/frame.js is missing: run `turbo run frame` first')
  }
  if (Math.max(...TIERS.map((tier) => newest(tier.source))) > statSync(FRAME).mtimeMs) {
    throw new Error(
      '`frame.js` is older than the components it bundles, so both sides would render the library as it was before your change. Run `turbo run frame` and try again.',
    )
  }
  const scope =
    changed === undefined
      ? null
      : scopeFor(changed, { label: 'parity', own: OWN.parity, root, tiers: TIERS })
  const examples: { dir: string; family: string; slug: string; tier: (typeof TIERS)[number] }[] = []
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
        if (existsSync(join(dir, `${slug}.tsx`))) {
          examples.push({ dir, family: entry.name, slug, tier })
        }
      }
    }
  }

  rmSync(BUILT, { force: true, recursive: true })
  mkdirSync(BUILT, { recursive: true })
  const entries = examples.map((one) => {
    const id = `${one.tier.name}--${one.family}--${one.slug}`
    const file = join(BUILT, `${id}.tsx`)
    writeFileSync(
      file,
      `import { createRoot } from 'react-dom/client'\n` +
        `import { Example } from ${JSON.stringify(join(one.dir, `${one.slug}.tsx`))}\n` +
        `createRoot(document.getElementById('root')).render(<Example />)\n`,
    )
    return { ...one, file, id }
  })
  if (entries.length > 0) {
    /* `root` pinned, because Bun derives the output layout from the entries'
       common parent and a large corpus once came out under a different
       directory than a small one, every module a 404. Splitting off, because
       a scoped run builds a different set and a shared chunk it never fetched
       left React rendering nothing. */
    const built = await Bun.build({
      entrypoints: entries.map((one) => one.file),
      minify: false,
      outdir: join(BUILT, 'out'),
      plugins: [stubStylesheets],
      root: BUILT,
      splitting: false,
      target: 'browser',
    })
    if (!built.success) {
      throw new Error(
        `${built.logs.length} example(s) would not build: ${built.logs.map(String).join('; ')}`,
      )
    }
    const unbuilt = entries.filter((one) => !existsSync(join(BUILT, 'out', `${one.id}.js`)))
    if (unbuilt.length > 0) {
      throw new Error(
        `${unbuilt.length} bundle(s) are not where they are served from, starting with ${unbuilt[0].id}.js`,
      )
    }
  }

  return {
    note:
      skipped.size > 0
        ? `${skipped.size} families the change does not reach are not compared`
        : undefined,
    pairs: entries.map((one) => {
      const files = { 'styles.css': `${one.slug}.css` }
      const styles = [...(one.tier.sheet ? ['/frame.css'] : []), 'styles.css']
      const shared = { dir: one.dir, files, scripts: ['/frame.js'], styles }
      return {
        a: { ...shared, body: readFileSync(join(one.dir, `${one.slug}.html`), 'utf8') },
        /* The module after the deferred bundle, in the body, so the bundle has
           defined the tags before React renders them, as it has for the HTML. */
        b: {
          ...shared,
          body: `<div id="root"></div><script type="module" src="/bundle/${one.id}.js"></script>`,
          head: '<style>#root{display:contents}</style>',
        },
        group: one.family,
        name: `${one.tier.name}/${one.family}/${one.slug}`,
      }
    }),
    serve: { '/bundle/': join(BUILT, 'out/') },
  }
}

export default defineConfig({
  exceptions: [
    {
      entry: 'styled/video/native',
      measured:
        'differed by 22, 34 and 122 pixels, matched twice, then differed by 188, all inside the controls',
      reason:
        "The user agent's own video controls, in a shadow root nothing here reaches, which no wait or retry settles.",
      unstable: true,
    },
    {
      differs: true,
      entry: 'styled/outline/events',
      reason:
        'The outline announces its opening position during its first update. The markup twin binds a deferred module script too late to hear it; React binds at dispatch and does.',
    },
  ],
  platform: 'any',
  report: '.helix/parity',
  serve: {
    '/fonts/': 'fusion/site/public/fonts/',
    '/frame.css': 'fusion/site/public/sandbox/frame.css',
    '/frame.js': 'fusion/site/public/sandbox/frame.js',
  },
  settle: { readyProperty: 'whenSettled' },
  shard: { cost: measured('parity'), perShot: ESTIMATE.parity.per },
  /* One width: the question is whether two syntaxes agree, and a second
     width asks the same question again. */
  shots: [{ name: 'wide', scheme: 'light', suffix: '', width: 640 }],
  sources: [
    {
      check: async ({ entry, page }) => {
        if (entry.side !== 'TSX') {
          return []
        }
        const empty = await page.evaluate(
          () => document.getElementById('root')?.childElementCount === 0,
        )
        return empty ? ['rendered nothing into #root'] : []
      },
      errors: 'ignore',
      kind: 'pairs',
      labels: ['HTML', 'TSX'],
      name: 'parity',
      prepare,
    },
  ],
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: `helix visual` runs outside turbo, so no task's cache reads it.
  timings: process.env.BROWSER_COST,
})
