/**
 * The visual tests' config for this repository: every Helix example, in both
 * tiers, at 640 light, 390 light and 640 dark.
 *
 * **Everything Fusion-specific about the visual check is here, and nothing of
 * it is in the package.** The two tiers, `frame.css`, Helix's `whenSettled`,
 * the measured cost of each family, the diagnostics and how a baseline is
 * retaken are facts about this repository. `helix visual` is the harness
 * that pictures them for any project.
 *
 * **The headless tier links no stylesheet from outside its own directory.**
 * Each `.examples/preview.html` there renders one family against
 * `preview.css`, a hand-written sheet with no token, no theme and a fixed
 * seven-value gray ramp, which is the determinism a comparison needs with
 * nothing asked of anybody. A page links it as `styles.css`, and `files`
 * answers that with the sheet beside it.
 *
 * **The styled tier needs `frame.css`, and without it the pages look
 * plausible rather than broken.** A styled sheet resolves design tokens, and
 * `frame.css` is the only file that defines them for a page assembled here.
 * Measured at 640 without it, 23 of the 30 `<helix-icon>` elements in the
 * corpus were 100 pixels or wider and three pages overflowed: `app-header` at
 * 707, `pin-input` at 984 and `toolbar` at 667. A baseline taken that way
 * defends the broken picture. `turbo run frame` writes it, and the scripts
 * that run this build it first.
 *
 * **The three brand faces are served, because `frame.css` asks for them.**
 * Unserved, `document.fonts` reported `Fusion Sans: error` and the styled tier
 * was drawn in the platform's `sans-serif`. `helix visual` fails an entry whose font
 * does not load.
 *
 * **Every family is pictured whatever changed**, unlike parity and hydration.
 * A family's render reads the tokens, the base element, the shared sheets, the
 * icons and the bundle, and packages outside the two tiers such as
 * `helix/map`, so a scope drawn from the changed paths would miss pictures.
 *
 * **Dark is a third picture because a whole mode was unwatched.** Orb shipped
 * a near-black red on a near-black ground in dark, reading `lab()` channels as
 * red, green and blue, and nothing pictured dark.
 */
import { join } from 'node:path'
import { defineConfig, type Inspected } from '@fusion.dev/helix-cli/visual'
import { ESTIMATE, measured } from '@fusion.dev/scripts/cost'
import { ARTIFACT, root, SOURCE } from '@fusion.dev/scripts/workspace'

/** A headless example links its own sheet as `styles.css`. */
const files = { 'styles.css': '{stem}.css' }

/**
 * The diagnostics bundle and both manifests, built once per run and only when
 * the first example asks: every page pictured is an example as a reader copies
 * it, so each is diagnosed where it stands, after its first picture.
 */
let built: Promise<{ manifests: Record<string, unknown>; source: string }> | undefined
const diagnostics = () => {
  built ??= (async () => {
    const bundled = await Bun.build({
      entrypoints: [join(root, 'helix/diagnostics/src/index.ts')],
      target: 'browser',
    })
    if (!bundled.success) {
      throw new Error(`the diagnostics would not build: ${bundled.logs.join('; ')}`)
    }
    const read = async (path: string) => JSON.parse(await Bun.file(join(root, path)).text())
    return {
      manifests: {
        '@fusion.dev/helix': await read(ARTIFACT.styledManifest),
        '@fusion.dev/helix-headless': await read(ARTIFACT.headlessManifest),
      },
      source: await bundled.outputs[0].text(),
    }
  })()
  return built
}

export default defineConfig({
  /* Each example's accessibility tree beside its pictures, so a lost name or
     role fails where no pixel moved. */
  aria: true,
  /* Text a box cuts off, and text or controls that collide in the flow, on
     each example as it was pictured. Contrast runs in its own job, which
     renders each example in the sandbox frame and reports the modeled pairs
     no example paints. */
  checks: { clipped: true, overlap: true },
  inspect: {
    /* The CI sink over every example this shard pictured: the file the
       `telemetry` job sends, and the summary here. A dead part, a dead hook,
       an attribute the element does not take, or a value it does not allow
       fails the run, as a moved pixel does. A retake is not held up by it,
       being about pictures. */
    report: async (runs: Inspected[], { update }) => {
      const { ciSink } = await import(join(root, 'helix/diagnostics/src/ci.ts'))
      const diagnosed = ciSink(
        runs.map((one) => one.result),
        { file: join(root, '.local/diagnostics/examples.json') },
      )
      console.error(diagnosed.summary)
      return { failed: diagnosed.code === 1 && !update }
    },
    run: async ({ entry, page }) => {
      const { manifests, source } = await diagnostics()
      return page.evaluate(
        async ({ manifests, page, source }) => {
          const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
          const { diagnose } = await import(url)
          URL.revokeObjectURL(url)
          return diagnose({
            detail: { pages: 'full' },
            environment: 'ci',
            page,
            project: { name: 'fusion examples', tags: ['fusion'] },
            tiers: Object.entries(manifests).map(([name, manifest]) => ({ manifest, name })),
          })
        },
        { manifests, page: `/${entry.id}`, source },
      )
    },
  },
  /* What a changed region is traced to: each tag's file, from the manifests
     the build writes. */
  manifest: ['helix/headless/custom-elements.json', 'helix/styled/custom-elements.json'],
  retake:
    'Dispatch the `Visual baselines` workflow on your branch and review the pull request it opens.',
  serve: {
    '/fonts/': 'fusion/site/public/fonts/',
    '/frame.css': 'fusion/site/public/sandbox/frame.css',
    '/frame.js': 'fusion/site/public/sandbox/frame.js',
  },
  settle: { readyProperty: 'whenSettled' },
  /* By what each family took on a runner, which is what `plan-browser.mjs`
     sizes the shards from, so the count it plans and the packing here agree. */
  shard: { cost: measured('visual'), perShot: ESTIMATE.visual.per },
  /* The wide shot keeps the empty suffix, so its baselines keep the name they
     were first committed under: `preview.png`. */
  shots: [
    { name: 'wide', scheme: 'light', suffix: '', width: 640 },
    { name: 'narrow', scheme: 'light', width: 390 },
    { name: 'dark', scheme: 'dark', width: 640 },
  ],
  sources: [
    {
      files,
      glob: '{name}/.examples/preview.html',
      kind: 'html',
      name: 'headless',
      root: SOURCE.headless,
      scripts: ['/frame.js'],
    },
    {
      files,
      glob: '{name}/.examples/preview.html',
      kind: 'html',
      name: 'styled',
      root: SOURCE.styled,
      scripts: ['/frame.js'],
      styles: ['/frame.css'],
    },
  ],
  /* `verify`'s browser jobs and `measure-browser.mjs` name a file here, and
     `measure:browser --from` merges a run's worth of them. */
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: `helix visual` runs outside turbo, so no task's cache reads it.
  timings: process.env.BROWSER_COST,
})
