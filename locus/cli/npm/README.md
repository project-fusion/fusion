# @fusion.dev/locus

Fusion Locus is a visual regression testing tool for web projects. It takes
pictures of your pages and components in a real browser, compares each one to
a baseline kept in your git repository, and fails the run when a picture
changes.

**Fusion Locus is in development.** It pictures HTML files, any server's pages,
Storybook stories, and entries from a JSON catalog, and it has a GitHub Action.
What comes next is in the roadmap below.

```sh
npm install --save-dev @fusion.dev/locus playwright
npx playwright install --with-deps chromium
```

The command is a native binary, and npm installs the build for your machine
beside this package: macOS and Linux on Arm and x86-64, and Windows on x86-64.
An install that skips optional dependencies skips it too, and `locus` then
names the package it is missing. `LOCUS_BIN` names a binary to run instead.
Capture runs in Playwright, which you install beside it.

## Commands

```sh
locus test                    compare every shot, and fail on a difference
locus test button             only the entries named button
locus update                  write only the baselines the comparison rejects
locus test --shard 0 --of 4   the first of four shards, for CI
locus report                  open the report of the last run
locus compare a.png b.png     compare two PNG files, with no browser
```

- **`locus test`** pictures every entry and compares each shot with its
  baseline. It exits 1 when a shot differs, changes size, has no baseline, or
  cannot be taken, and writes an image of each difference beside its baseline,
  named `<stem><suffix>.diff.png`. Add `*.diff.png` to your `.gitignore`.
- **`locus update`** pictures every entry and writes a baseline only where the
  comparison would fail. Review the files it writes before you commit them.
- **`locus report`** opens the report the last run wrote. `--markdown` prints
  its summary as Markdown instead, for a CI job's summary page.
- **`locus compare`** compares two PNG files. `--diff` writes the image of the
  difference, and `--threshold` sets how far apart two colors may be and still
  count as the same pixel, from 0 to 1.

Each run ends with one line that says what it compared and what it skipped.
`--config` names the config file, `--workers` sets how many pages capture at
once, and `--shard` with `--of` takes one shard of a run split across jobs.

## The config

`locus.config.ts`, in the directory you run `locus` from:

```ts
import { defineConfig } from '@fusion.dev/locus'

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

- **`sources`**: where the entries come from, four kinds:
  - `html` reads every file its `glob` matches under `root`, described next.
  - `server` pictures a server's `routes`, and every route its `sitemap` lists.
    `/` is named `index`, and a route given as `{ name, path }` takes its name.
  - `storybook` pictures every story in a running Storybook's `index.json`.
    `include` and `exclude` filter them by tag.
  - `catalog` pictures every `{ id, url }` in a JSON file, each `url` relative to
    the server.

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
  that resolves once they have rendered. Locus awaits it before each shot.
- **`diff`**: how a shot is compared, for the whole config or for one source.
  `mode: 'pixel'` counts the pixels past `threshold`, 0.1 unless you set it,
  and fails above `pixels`, 0 unless you set it. `mode: 'perceptual'` scores
  structural similarity and fails below `ssim`, 0.99 unless you set it, for
  photographs and gradients whose pixels move a shade on every render.
- **`exceptions`**: each names an `entry`, optionally a `shot`, and a `reason`.
  `unstable: true` skips the shot and names it in every run. `pixels` lets the
  shot differ by that many, and the run fails once the shot stops differing, so
  an exception that is no longer needed is removed.
- **`inspect`**: `run` is called with the Playwright page after each entry's
  first shot, and `report` once at the end with everything `run` returned.
  `report` returns `{ failed: true }` to fail the run.
- **`shard`**: `cost` maps entry names to measured seconds, so shards are packed
  by time. Entries with no measurement weigh `perShot` seconds a shot.
- **`timings`**: a file to write each entry name's seconds to, which is how you
  measure `shard.cost`.
- **`mask`**: selectors whose elements are painted over in one fixed color in
  every picture, for what changes on its own, such as a version number.
- **`style`**: a stylesheet applied while each picture is taken, to hold still
  what `mask` cannot, such as a masked element whose width follows its text.
- **`report`**: where each run writes its report, `.locus/report` unless you
  set it. Add `.locus/` to your `.gitignore`.
- **`retake`**: a sentence telling your team how to retake baselines, printed
  when a run fails.
- **`fingerprint`**, **`network`**, and **`platform`** are described below.

## What every run does

- **Capture holds still.** Before each shot Locus waits for every custom
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
- **Baselines are taken and compared on Linux.** On another platform `locus
  test` says so and exits 0. `platform: 'any'` compares wherever it runs.
- **The environment is recorded.** `locus update` of every entry writes
  `locus.fingerprint.json`: the platform, the operating system release, the
  browser version, and a hash of the installed fonts. A run on an environment
  that differs stops and names what differs, because every picture would
  differ for that reason alone.

## The report

Every `locus test` and `locus update` writes a report into the config's
`report` directory: `index.html` to look at, and `run.json` for a program to
read. The page shows each shot that failed with its baseline, its capture, and
its difference side by side, and a swipe between the baseline and the capture.
It lists the shots that needed a second take, the exceptions with their
measurements, and what was skipped. The directory is emptied at the start of
each run.

## The GitHub Action

The Action lives in this repository, in `locus/action`.

```yaml
- uses: project-fusion/fusion/locus/action@main
  with:
    mode: check
```

- **`mode: check`** installs Chromium and its system packages from the cache,
  runs `locus test`, writes the summary to the job's summary page, and on a
  failure uploads the report and the diff images.
- **`mode: retake`** runs `locus update` and opens a pull request with what it
  wrote, on a branch named for the ref. Give it `token` from a GitHub App or a
  person: a pull request opened with `GITHUB_TOKEN` starts no checks. Run it on
  `workflow_dispatch` only, with `concurrency` set to queue and never cancel, so
  a retake is asked for and never cut in half.

`args` passes arguments to `locus`, such as `--config` or `--shard`. `locus`
and `playwright` name the commands that run each, `npx --no-install locus` and
`npx --no-install playwright` unless you set them.

## How it works

- **Local-first.** Locus runs on your machine and in your CI. It needs no
  hosted service, and no picture leaves your machine unless you turn that on.
- **Baselines in git.** Each baseline is a file in your repository. A retake
  writes only the pictures the comparison rejects, and the pull request that
  carries them is where you review the change.
- **Three shots by default.** A wide width, a phone width, and the dark color
  scheme, each compared to its own baseline.
- **The environment is part of the baseline.** The browser version, the
  operating system image, and the installed fonts are recorded beside the
  baselines, and a run on a different environment stops and names what differs.
- **A Rust core and a Playwright driver.** The `locus` binary reads the config,
  finds what to picture, shards the work, decodes and compares the images, and
  writes the report. Capture runs in a small Node driver that runs Playwright,
  and the driver ships in this package.

## Roadmap

| Phase | What it adds |
|---|---|
| 1. Core | `locus test` and `locus update` on plain HTML sources. The config file, the environment fingerprint, the pixel diff, exceptions with their measurements, deterministic shards, and capture that waits for the page to hold still, refuses requests to other origins, and takes all three shots from one page load |
| 2. Ship | Server and Storybook sources, a perceptual diff, the HTML report behind `locus report`, the GitHub Action with its `check` and `retake` modes, documentation, and the first public `0.x` |
| 3. Checks | Differential checks with no baseline, such as server rendering against client rendering. Page checks on the render that was pictured: unhighlighted code blocks, clipped text, overlapping elements, and contrast. Accessibility snapshots stored beside each picture, and each changed region traced to the elements under it |
| 4. Triage | A model that groups and explains changes, only on a failed comparison and only when you configure one. Off by default, text-only first, local or hosted models, and a cost cap per run |
| GitHub App | Opens the baselines pull request for a retake so your required checks run on it, without a token you create and store. Planned after phase 2 |

MIT
