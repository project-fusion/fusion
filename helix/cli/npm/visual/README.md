# Visual tests

`helix visual` takes pictures of your pages and components in a real browser,
compares each one to a baseline kept in your git repository, and fails the run
when a picture changes. It ships in `@fusion.dev/helix-cli`, and it pictures
any web project, with Helix or without it.

It pictures HTML files, any server's pages, Storybook stories, and entries from
a JSON catalog, and it has a GitHub Action. What comes next is in the roadmap
below.

```sh
npm install --save-dev @fusion.dev/helix-cli playwright
npx playwright install --with-deps chromium
```

Capture runs in Playwright, which you install beside the command line. The
rest of `helix` needs no browser, so Playwright is an optional peer, and
`helix visual test` names it when it is missing.

## Commands

```sh
helix visual test                    compare every shot, and fail on a difference
helix visual test button             only the entries named button
helix visual update                  write only the baselines the comparison rejects
helix visual test --shard 0 --of 4   the first of four shards, for CI
helix visual report                  open the report of the last run
helix visual compare a.png b.png     compare two PNG files, with no browser
```

- **`helix visual test`** pictures every entry and compares each shot with its
  baseline. It exits 1 when a shot differs, changes size, has no baseline, or
  cannot be taken, and writes an image of each difference beside its baseline,
  named `<stem><suffix>.diff.png`. Add `*.diff.png` to your `.gitignore`.
- **`helix visual update`** pictures every entry and writes a baseline only where the
  comparison would fail. Review the files it writes before you commit them.
- **`helix visual report`** opens the report the last run wrote. `--markdown` prints
  its summary as Markdown instead, for a CI job's summary page.
- **`helix visual compare`** compares two PNG files. `--diff` writes the image of the
  difference, and `--threshold` sets how far apart two colors may be and still
  count as the same pixel, from 0 to 1.

Each run ends with one line that says what it compared and what it skipped.
`--config` names the config file, `--workers` sets how many pages capture at
once, and `--shard` with `--of` takes one shard of a run split across jobs.

`helix --json visual …` prints one JSON document on stdout and moves the
sentences to stderr: `test` and `update` print the run's record, the same as
the report's `run.json`, `report` prints the last one, and `compare` prints
whether the two pictures match and how many pixels differ.

## The config

`visual.config.ts`, in the directory you run `helix visual` from:

```ts
import { defineConfig } from '@fusion.dev/helix-cli/visual'

export default defineConfig({
  serve: { '/theme.css': 'dist/theme.css' },
  shots: [
    { name: 'wide', scheme: 'light', width: 1280 },
    { name: 'phone', scheme: 'light', width: 390 },
    { name: 'dark', scheme: 'dark', width: 1280 },
  ],
  sources: [
    {
      glob: '{name}/example.html',
      kind: 'html',
      name: 'components',
      root: 'src',
      styles: ['/theme.css'],
    },
  ],
})
```

- **`sources`**: where the entries come from, five kinds:
  - `html` reads every file its `glob` matches under `root`, described next.
  - `server` pictures a server's `routes`, and every route its `sitemap` lists.
    `/` is named `index`, and a route given as `{ name, path }` takes its name.
  - `storybook` pictures every story in a running Storybook's `index.json`.
    `include` and `exclude` filter them by tag.
  - `catalog` pictures every `{ id, url }` in a JSON file, each `url` relative to
    the server.
  - `pairs` compares two renders of each entry with each other, described below.

  The three on a server take its `url`, a `start` command that runs only when
  nothing answers there and is stopped when the run ends, and `baselines`, the
  directory their baselines are written in. An `html` source reads every file
  its `glob` matches under `root`. `{name}` is the path segment that names the
  entry, `*` matches within a segment, and `**` matches any number of
  directories. Each file is pictured inside a document that links `styles`,
  loads `scripts` with `defer`, and sets the color scheme, the background, the
  text color, the width, and a 24-pixel inset on `body`. `harness: false`
  pictures the file as it is. `files` answers a relative request from a page
  with another file beside it, such as `{ 'styles.css': '{stem}.css' }`.
- **`shots`**: the pictures taken of each entry. A wide width, a phone width,
  and dark when you give none. Each baseline is written beside its entry as
  `<stem>.<name>.png`, and `suffix` changes `.<name>`.
- **`serve`**: URL paths served from disk, relative to the config. A path that
  ends in `/` serves a directory.
- **`settle.readyProperty`**: a property your elements carry holding a promise
  that resolves once they have rendered. `helix visual` awaits it before each shot.
  `settle.elements` limits the custom elements a run waits for to one tag
  prefix, for a framework that writes hyphenated tags it never defines.
- **`aria`**: keeps each entry's accessibility snapshot, Playwright's
  `ariaSnapshot()` of its page, beside its baselines as `<stem>.aria.yml`, and
  compares it as text, so a lost label fails even when no pixel moved. A
  snapshot leaves out what `mask` names. `{ hide: [...] }` keeps snapshots and
  leaves out more, for what is read aloud and never drawn, such as a table
  hidden visually: masked, its box would be painted over whatever it sits
  under.
- **`checks.code`**: fails a run on a code block that draws all of its text in
  one color, as a highlighter that failed leaves it. It reads the page after
  the first shot and needs no baseline. `selector` names your code blocks and
  `minimum` the fewest characters a block holds before it is judged.
- **`checks.clipped`**: fails a run on a box under `overflow: hidden` that cuts
  off its own text, where no `text-overflow` or line clamp says it means to.
  Only words that cross the edge count, so a carousel's slides out of view do
  not.
- **`checks.overlap`**: fails a run on two boxes of text or controls that draw
  over each other in the flow. A box positioned absolutely, fixed or sticky,
  given a `z-index`, transformed, floated or in the top layer is placed on
  purpose, and leaves the pair alone.
- **`checks.contrast`**: fails a run on an ink below WCAG 2.1 AA against the
  ground it is painted on, in each color scheme the shots picture. The ground
  is composited through every translucent layer, and a ground that is a
  picture or a video is not judged. `rules` names the colors of lines that
  separate, which answer to no target.
- Each check takes `ignore`, selectors it leaves alone with everything inside
  them, and an exception's `checks` excuses one entry from the checks it names.
- **`manifest`**: custom elements manifests, relative to the config. A shot
  that differs is told region by region: the element a reader would name that
  covers the region, and the file a manifest says defines it. A baseline
  carries its elements' boxes inside its PNG once a run writes it, and from
  then on the run also says how far each element moved.
- **`diff`**: how a shot is compared, for the whole config or for one source.
  `mode: 'pixel'` counts the pixels past `threshold`, 0.1 unless you set it,
  and fails above `pixels`, 0 unless you set it. `mode: 'perceptual'` scores
  structural similarity and fails below `ssim`, 0.99 unless you set it, for
  photographs and gradients whose pixels move a shade on every render.
- **`exceptions`**: each names an `entry`, optionally a `shot`, and a `reason`.
  `unstable: true` skips the shot and names it in every run. `pixels` lets the
  shot differ by that many, and the run fails once the shot stops differing, so
  an exception that is no longer needed is removed. `differs: true` tolerates a
  known difference between a pair's two sides, and fails once they match.
  `checks` excuses the entry from the page checks it names, and fails once a
  named check finds nothing there.
- **`inspect`**: `run` is called with the Playwright page after each entry's
  first shot, and `report` once at the end with everything `run` returned.
  `report` returns `{ failed: true }` to fail the run.
- **`shard`**: `cost` maps entry names to measured seconds, so shards are packed
  by time. Entries with no measurement weigh `perShot` seconds a shot.
- **`timings`**: a file to write each entry name's seconds to, which is how you
  measure `shard.cost`.
- **`mask`**: selectors whose elements are painted over in one fixed color in
  every picture and left out of every accessibility snapshot, for what changes
  on its own, such as a version number.
- **`style`**: a stylesheet applied while each picture is taken, to hold still
  what `mask` cannot, such as a masked element whose width follows its text.
- **`report`**: where each run writes its report, `.helix/visual` unless you
  set it. Add `.helix/visual/` to your `.gitignore`.
- **`retake`**: a sentence telling your team how to retake baselines, printed
  when a run fails.
- **`fingerprint`**, **`network`**, and **`platform`** are described below.

## Pairs

A `pairs` source compares two renders of each entry with each other, with no
baseline: React against plain HTML, a server render against a client render, a
framework wrapper against the element it wraps. Both sides render on one machine
seconds apart, so the platform cancels out. Pairs run anywhere, and nothing they
picture is committed.

```ts
{
  kind: 'pairs',
  labels: ['HTML', 'TSX'],
  name: 'parity',
  prepare: async ({ changed }) => ({
    pairs: [{ a: { body: html }, b: { body: '<div id="root"></div>' }, name: 'button' }],
    serve: { '/bundle/': '/absolute/path/to/bundles/' },
  }),
}
```

- **`prepare`** builds the pairs. It runs in Node, so it can call your bundler
  or your server renderer, and it receives the git ref `--changed` named. Each
  side is a `body` the harness wraps, with its own `styles`, `scripts`, `head`,
  `dir`, and `files`, or a `url`, or an `error` when it could not be built.
- **`check`** is called on each side's page after its first shot, with the page
  and every console message it logged, and returns problems that fail the pair.
- **`errors`** counts console errors: `new`, an error the second side logs and
  the first does not, is the default, `any` counts all of them, and `ignore`
  none.
- **`compare: false`** judges a pair by its `check`, its errors, and its tags
  alone, with no pictures compared.

## What every run does

- **Capture holds still.** Before each shot `helix visual` waits for every custom
  element to be defined, the fonts to load, each element's ready promise, and
  the page's boxes and scroll offsets to stay the same for three frames. It
  emulates reduced motion and takes the shot with animations disabled. A font
  that fails to load fails the entry.
- **One page load for all the shots of an entry.** The viewport, the color
  scheme, and the harness style change between shots on the same page.
- **A difference is taken again from a fresh page load.** A shot that matches
  on the second take passes, and the run names it.
- **Requests stay on the harness origin.** Every request to another host is
  refused, so a baseline never records what another server returned.
  `network: 'open'` turns that off.
- **Baselines are taken and compared on Linux.** On another platform `helix
  visual test` says so and exits 0. `platform: 'any'` compares wherever it runs.
- **The environment is recorded.** `helix visual update` of every entry
  writes `visual.fingerprint.json`: the platform, the operating system release, the
  browser version, and a hash of the installed fonts. A run on an environment
  that differs stops and names what differs, because every picture would
  differ for that reason alone.

## The report

Every `helix visual test` and `helix visual update` writes a report into the config's
`report` directory: `index.html` to look at, and `run.json` for a program to
read. The page shows each shot that failed with its baseline, its capture, and
its difference side by side, and a swipe between the baseline and the capture.
It lists the shots that needed a second take, the exceptions with their
measurements, and what was skipped. The directory is emptied at the start of
each run.

## The GitHub Action

The Action lives in the Fusion repository, in `helix/visual/action`.

```yaml
- uses: project-fusion/fusion/helix/visual/action@main
  with:
    mode: check
```

- **`mode: check`** installs Chromium and its system packages from the cache,
  runs `helix visual test`, writes the summary to the job's summary page, and
  on a failure uploads the report and the diff images.
- **`mode: retake`** runs `helix visual update` and opens a pull request with
  what it wrote, on a branch named for the ref. Give it `token` from a GitHub
  App or a person: a pull request opened with `GITHUB_TOKEN` starts no checks.
  Run it on `workflow_dispatch` only, with `concurrency` set to queue and never
  cancel, so a retake is asked for and never cut in half.

`args` passes arguments to `helix visual`, such as `--config` or `--shard`.
`helix` and `playwright` name the commands that run each,
`npx --no-install helix` and `npx --no-install playwright` unless you set them.

## How it works

- **Local-first.** `helix visual` runs on your machine and in your CI. It needs no
  hosted service, and no picture leaves your machine unless you turn that on.
- **Baselines in git.** Each baseline is a file in your repository. A retake
  writes only the pictures the comparison rejects, and the pull request that
  carries them is where you review the change.
- **Three shots by default.** A wide width, a phone width, and the dark color
  scheme, each compared to its own baseline.
- **The environment is part of the baseline.** The browser version, the
  operating system image, and the installed fonts are recorded beside the
  baselines, and a run on a different environment stops and names what differs.
- **A Rust core and a Playwright driver.** The `helix` binary reads the config,
  finds what to picture, shards the work, decodes and compares the images, and
  writes the report. Capture runs in a small Node driver that runs Playwright,
  and the driver ships in `@fusion.dev/helix-cli`.

## Roadmap

| Phase | What it adds |
|---|---|
| 1. Core | `helix visual test` and `helix visual update` on plain HTML sources. The config file, the environment fingerprint, the pixel diff, exceptions with their measurements, deterministic shards, and capture that waits for the page to hold still, refuses requests to other origins, and takes all three shots from one page load |
| 2. Ship | Server and Storybook sources, a perceptual diff, the HTML report behind `helix visual report`, the GitHub Action with its `check` and `retake` modes, documentation, and the first public `0.x` |
| 3. Checks | Differential checks with no baseline, such as server rendering against client rendering. Page checks on the render that was pictured: unhighlighted code blocks, clipped text, overlapping elements, and contrast. Accessibility snapshots stored beside each picture, and each changed region traced to the elements under it |
| 4. Triage | A model that groups and explains changes, only on a failed comparison and only when you configure one. Off by default, text-only first, local or hosted models, and a cost cap per run |
| GitHub App | Opens the baselines pull request for a retake so your required checks run on it, without a token you create and store. Planned after phase 2 |
