# @fusion.dev/helix-diagnostics

Finds the Helix mistakes that are valid CSS and therefore silent: a `::part()`
naming a part nothing publishes, a custom property named for the wrong family, a
part a composed component never forwarded, two copies of the library on one page.

```sh
npm install --save-dev @fusion.dev/helix-diagnostics
```

## Start it in your app

Call `initDiagnostics()` once, at your app's entry, before the app mounts:

```js
import { initDiagnostics } from '@fusion.dev/helix-diagnostics'

initDiagnostics({ environment: import.meta.env.MODE })
```

It needs nothing from a framework, so the call is the same wherever Helix runs:

- `main.ts` in Vite, Vue, Svelte, or Solid;
- before `bootstrapApplication` in Angular, inside `ngZone.runOutsideAngular`
  so its callbacks do not run change detection;
- `instrumentation-client.ts` in Next.js;
- a `<script type="module">` on a page with no bundler.

On a server, with no `document`, it does nothing, so it is safe in code that
server-side rendering also runs. A second call returns the first call's handle,
so React's strict mode and hot module replacement start nothing twice.

**What it does from there:**

- **Counts from the start**, every Helix element that renders, including ones
  that go, such as a closed dialog.
- **Loads the lint data for the exact Helix version on the page**, from a public
  npm CDN, about 18 KB compressed for each tier. Offline, or on a locked-down
  network, pass it yourself:
  `tiers: [{ lint }]` with `import lint from '@fusion.dev/helix/lint.json'`.
- **Runs itself**: after the page loads, after a navigation, and after the page
  changes, once changes stop for a second, in an idle moment, and never sooner
  than two seconds after the last run, nor sooner than twenty times its
  duration. A page that never stops changing still runs within ten seconds.
  Nothing runs in a hidden tab, or when nothing changed.
- **Prints each finding once per page**, in DevTools, at the levels your
  `console` setting gives. The heading still counts every finding.
- **Shows the findings on the page**, in development. A badge in the corner
  counts them and opens a list of each finding with its evidence. Hover over a
  finding, or focus it, to outline the element it is about. The badge shows
  only while the page has findings.
- **Hears what the library reports as it runs**, such as a selectable table
  with no `row-key`, and lists each event in the run, the badge, and the relay.
  Core still prints each one as it happens, with the stack it happened in. Set
  `core: { warnings: false }` to have diagnostics print them in its group
  instead.
- **Measures what the components cost, where you ask**: each tag's first
  updates, layout shift, and long tasks. See [Performance](#performance).
- **Hands each run to your app**: the `onReport` option, `subscribe()` on the
  handle it returns, and a `helix-diagnostics` event on `document`.

**It never runs in production by accident.** With no `environment`, it runs only
on a local host: `localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, and `*.test`.
Production runs only with `environment: 'production'` and
`environments: { production: { sample } }`, and there each run goes to your app
alone. A visitor sees nothing in the console or on the page.

**It never breaks your app.** It never throws. A setting that names nothing is
printed with the closest real one, and the handle does nothing. A run that
throws is printed, and three failures in a row stop it. A subscriber that
throws stops neither the others nor the console.

| Option | What it is |
| --- | --- |
| `environment` | `development`, `ci`, or `production`, as your build says it |
| `tiers` | Lint data or manifests to check against, where you pass them yourself |
| `cdn` | Where lint data loads from; `false` loads nothing |
| `page` | A function returning the page's path as your router names it, such as `/products/[id]` |
| `onReport` | Called with each run |
| `duplicates` | `duplicateRegistrations` from `@fusion.dev/helix-core` |
| `file` | Your project's `helix-diagnostics.json`, imported |
| Any setting below | `rules`, `console`, `core`, `sinks`, `send`, `detail`, `environments`, `project` |

The handle has `active`, `latest`, `run()`, `subscribe()`, and `stop()`. An
end-to-end test reaches it at `globalThis[Symbol.for('fusion.dev/helix/diagnostics')]`
to assert that a page has no findings.

The badge is one element, `helix-diagnostics-overlay`, with its own shadow root
and its own styles. Diagnostics leaves it out of everything it counts and reads.
It is never on a page in CI, so your screenshots never hold it. Turn it off in
development with `sinks: { overlay: false }`.

## Print the findings in your terminal

A page cannot write to your terminal, so the Helix CLI has a command that
receives each run beside your dev server. Install the CLI, then start the
command in the project's directory:

```sh
npm install --save-dev @fusion.dev/helix-cli
npx helix diagnostics
```

Then turn the relay on where you call `initDiagnostics()`:

```js
initDiagnostics({ environment: import.meta.env.MODE, sinks: { relay: true } })
```

Each run that differs from the last one for its page is posted to
`http://127.0.0.1:7417`, and the command prints each finding the first time a
page has it. For a relay on another port, such as one started with
`--port 7500`, pass its address: `sinks: { relay: 'http://127.0.0.1:7500' }`.
The address is always on a local host.

- **It is off by default.** A browser prints a refused connection in DevTools
  on every page load where nothing listens. With the relay on and the command
  not running, one warning is printed in the console, and nothing is sent.
- **It serves your settings.** Where you pass no `file`, the page loads
  `helix-diagnostics.json` from the directory the command runs in, so you do
  not need to import it. Pass `--config <path>` for a file elsewhere. A file
  that does not parse is not served.
- **It writes the CI file.** With `--out reports/helix-diagnostics.json`, it
  keeps the latest run of every page there, in the shape `ciSink` writes.
- **It takes runs from pages on a local host only**: `localhost`, `127.0.0.1`,
  `[::1]`, `*.localhost`, and `*.test`. It listens on `127.0.0.1`, so nothing
  else on your network reaches it, and production pages never send to it.

## Run it once, directly

`diagnose()` is one run, which `initDiagnostics()` makes for you. Call it
yourself in a test, a script, or anywhere you want a single report:

```js
import { diagnose, report } from '@fusion.dev/helix-diagnostics'
import styled from '@fusion.dev/helix/lint.json' with { type: 'json' }
import headless from '@fusion.dev/helix-headless/lint.json' with { type: 'json' }

report(diagnose({ tiers: [{ lint: styled }, { lint: headless }] }))
```

`diagnose` needs at least one tier and says so instead of defaulting: with none,
every part name is unknown and every finding would be noise. It takes lint data
or a full `custom-elements.json`. Pass both tiers when both are installed, since
a part the headless tier publishes and the styled tier never forwarded is only
visible with both. `report` is the console sink; the `Report` it returns is the
same object, so you can send it somewhere else as well.

None of these faults produces an error anywhere. They are detectable only against
the manifest, which every Helix package publishes, so the diagnostic cannot
drift from what is true.

## What a report holds

A report is one run, in one shape for every sink, versioned by `schema`:

- **`run`**: a new `id`, when it began (`at`), how long it took, where it ran
  (`environment`, as you declare it), and the `page`, as a pattern by default:
  `/orders/1042` reads `/orders/:id`.
- **`project`**: the name and tags your configuration gives. The key is never
  written into a report.
- **`versions`**: the collector's and the rules', the Helix versions loaded on
  the page (two means two copies), and the version each manifest describes.
- **`coverage`**: how many stylesheets and shadow roots were read, and which
  sheets could not be. A cross-origin stylesheet throws on `.cssRules`, so a run
  that read three sheets of nineteen returns the same empty findings as one that
  read all nineteen. Read `coverage` before you believe `findings`.
- **`findings`**: each with its kind, a severity, the place that set the
  severity, the tag and its family, a `category` (`styling`, `markup`,
  `integrity`, or `guideline`), an `owner` (`consumer`, or `helix` for a fault
  in the library), a `fingerprint` that stays the same from one run to the next
  for the same fault, and the rule's own text as evidence.
- **`performance`**: what the components cost, by tag, where you asked for it.
  See [Performance](#performance).
- **`runtime`**: what the library reported going wrong as it ran on the page,
  from its first load. One entry per distinct event, with its `kind`, its
  `tag`, the sentence that says what to do, how many times it was reported,
  and whether core printed it. A `fingerprint` stays the same from one run to
  the next, with the numbers in the sentence left out.
- **`usage`**: the Helix elements on the page by tag, the axes set on them
  (`emphasis`, `material`, `separation`, and `tone`), the named slots filled,
  the elements Helix renders inside other Helix elements, and the parts and
  hooks your stylesheets use, with the values the hooks are set to. With a
  watcher it counts every element that rendered since `watch()` began,
  including ones since removed, such as a closed dialog. Without one it counts
  the elements on the page at the moment of the run. Elements named `helix-*`
  that no manifest lists, such as your own, are counted apart as `unlisted`.
- **`configuration`**: the settings the run was made under, each override in
  effect, and how many findings each override turned off, by kind.
- **`withheld`**: the categories your configuration turned off for sending,
  and which place turned each off.

## What the console shows

`report` writes one group per run, headed by the counts. It opens when there
is something to act on, and collapses to one line when the run is clean. Each
kind of entry goes to its own console method, so the browser's level filter
works on it:

| Entry | Console method |
| --- | --- |
| A finding at `error` | `console.error` |
| A finding at `warn` | `console.warn` |
| A finding at `info` | `console.info` |
| A runtime event core left to diagnostics | `console.warn`, or `console.error` for a failure |
| Stylesheets that could not be read | `console.warn` |
| Coverage, and findings turned off | `console.info` |
| Usage | `console.debug`, hidden at the default level |
| Performance, where you asked for it | `console.info`, when the measures change |

## Finding kinds

| Kind | Severity | Means |
| --- | --- | --- |
| `dead-part` | error | A `::part()` names a part the element does not publish |
| `dead-hook` | error | A hook is set where nothing answers it, or a name close to a hook is set that nothing reads |
| `unknown-attribute` | error | A Helix element carries an attribute it does not take |
| `invalid-value` | error | An attribute with a closed set of values carries one outside it, so the element falls back to its default |
| `unforwarded-part` | warn | The headless tier publishes the part and the styled tier does not forward it, which is a gap in Helix |
| `unknown-tag` | error | A rule names a tag no manifest lists |
| `duplicate-registration` | error | Two copies of Helix are on the page |
| `manifest-skew` | error | The manifest is from another version than the page runs. It replaces every other finding, since each would be judged against the wrong version. Turned off, the page is judged as usual |

**Hooks are checked wherever they are set**: on a Helix tag, a class, `:root`,
or any other selector. A hook on a selector naming no Helix tag is judged only
on what the page holds now. It is a finding when the selector matches elements
and none of them is, or holds, an element that answers it, while one that does
is on the page. A selector matching nothing yet is left alone, since it may be
for another route.

**Attributes are checked on the elements the page wrote.** The global HTML
attributes, `aria-*`, `data-*`, and the prefixes frameworks write are never
findings. The markup Helix renders inside its own components is Helix's.

## Runtime events

Helix reports these itself as it runs, through one channel in
`@fusion.dev/helix-core`. Each is printed in the console as it happens, and
diagnostics counts it by kind and tag. None fails a CI job.

| Kind | Means |
| --- | --- |
| `cite-not-url` | A blockquote's `cite` holds words, where it takes the URL of the source |
| `deprecated` | A deprecated property, attribute or slot was used; the message names what replaces it |
| `duplicate-registration` | Two copies of Helix are on the page. Also the finding of the same name |
| `fullscreen-refused` | The browser refused fullscreen, usually in a frame without `allow="fullscreen"` |
| `min-out-of-range` | A rating's `min` is not a score between 0 and its `max` |
| `misplaced-handler` | A React `on` prop names an event that another element dispatches. Development builds only (the `development` export condition) |
| `misread-direction` | A stat was given `up`, `down` or `neutral`, which are Trend's directions and lay nothing out |
| `missing-alt` | An image has no `alt`, so a screen reader announces its file name |
| `missing-layout` | The three.js graph driver could not load `d3-force-3d` |
| `missing-name` | A button, form control, button group or open dialog has no accessible name. Development builds only (the `development` export condition) |
| `missing-row-key` | A selectable data table has no `row-key`, so it knows each row by its place |
| `missing-stencil-parts` | A graph stencil names parts its shape does not have |
| `missing-table` | A chart, legend or sparkline's `for` names no table once the page has loaded. Development builds only (the `development` export condition) |
| `missing-target` | A skip link's `href` names no element on the page |
| `missing-trigger` | A tooltip's `for` names no element in its own tree |
| `negative-value` | An area chart was given a negative number, which it draws as none |
| `not-a-graph` | `connectGraph` was given an element that is not a graph frame |
| `picture-in-picture-refused` | The browser refused picture in picture |
| `refused-length` | A grid's `min` is not a length it can write, so it lays out by `columns` |
| `removed-callback` | A React prop is a callback that was removed and never ran from JSX. Development builds only (the `development` export condition) |
| `solid-handler-syntax` | A React prop uses Solid's `on:` syntax. Development builds only (the `development` export condition) |
| `stencil-regions-unused` | A graph stencil's regions could not be used |
| `stencil-without-inside` | A graph stencil has no inside to place the notes in |
| `too-many-rows` | A data table is drawing more rows at once than it stays responsive to |
| `two-default-operators` | A filter field marks more than one operator as its default |
| `typed-marks` | A quote's text starts or ends with a typed quotation mark, which the browser's marks double |
| `unknown-event` | A React `on` prop names an event that no element dispatches. Development builds only (the `development` export condition) |
| `unknown-icon` | An icon's `name` is not in the Helix set, so it draws nothing |
| `unlinked-trigger` | A tooltip's trigger does not name it in `aria-describedby` |
| `unreachable-label` | A text is rendered as a label, a deprecated value that labels no control |
| `unscannable-logo` | A QR code holds a logo at a correction level below `H`, so it may not scan |
| `unsettled-window` | A virtualized list's box has no height of its own |
| `untold-toggle` | A native button in a button group with `selection-mode`, which cannot carry `aria-pressed` |
| `untold-trigger` | A slotted trigger is a plain element, which cannot carry `aria-expanded` |
| `wrapped-trigger` | A tooltip wraps its trigger, so its text reaches no screen reader |

## Performance

Diagnostics measures what the components cost only where you ask for it. Set
`console: { performance: 'info' }` to print the measures in DevTools, or
`send: { performance: true }` to keep them in each run, for your app, the
relay, and the CI file. For each tag rendered on the page, it measures:

- **First updates**: each element's own first update, from `willUpdate` to
  `updated`, as a count, a median, a 95th percentile, and the slowest. Time an
  element spends waiting behind other elements is not counted.
- **Layout shift**: the shift its elements moved, summed as the browser scores
  it. A shift that follows a press or a keystroke is left out.
- **Long tasks**: how many tasks of 50 ms or more one of its first updates ran
  in.

Core times each first update only while diagnostics is measuring, so a page
that has not asked pays one property read per element. Layout shift and long
tasks are measured in Chromium only. Elsewhere `measured` says so, and their
numbers are left out.

## Configure it

Every setting can be given in three places, and a later place wins, field by
field: the defaults this package ships, your project's file, and the call.
The page cannot read files, so import your file and pass it as `file`:

```js
import project from './helix-diagnostics.json' with { type: 'json' }

diagnose({
  environment: 'development',
  file: project,
  rules: { 'unforwarded-part': 'off' },
  tiers,
})
```

```json
{
  "project": { "name": "storefront", "tags": ["web"] },
  "rules": { "dead-hook": { "severity": "warn", "tags": ["helix-card"] } },
  "console": { "findings": "warn", "usage": "off" },
  "send": { "performance": false },
  "detail": { "evidence": "full", "hookValues": true, "pages": "patterns" },
  "environments": { "development": true, "ci": true, "production": false }
}
```

| Setting | Takes | Default |
| --- | --- | --- |
| `rules.<kind>` | `error`, `warn`, `info`, `off`, or `{ severity, tags }` | see Finding kinds |
| `console.findings` | `error`, `warn`, `info`, or `off`: the lowest severity printed | `info` |
| `console.coverage` | `info` or `off` | `info` |
| `console.usage` | `debug` or `off` | `debug` |
| `console.runtime` | `warn` or `off`: the runtime events core left to diagnostics | `warn` |
| `console.performance` | `info` or `off`: what the components cost, which is measured where this is on | `off` |
| `core.warnings` | `true` or `false`: whether core prints each runtime event as it happens | `true` |
| `sinks.overlay` | `true` or `false`, for the badge in development | `true` |
| `sinks.relay` | `true`, `false`, or an address on a local host, such as `http://127.0.0.1:7417` | `false` |
| `send.<category>` | `true` or `false`, for `findings`, `usage`, `coverage`, `configuration`, `runtime`, `performance`, and `assist` | all on but `performance` |
| `detail.evidence` | `full`, `selector`, or `none` | `full` |
| `detail.hookValues` | `true` or `false` | `true` |
| `detail.pages` | `patterns`, `full` (the path, never the query), or `none` | `patterns` |
| `environments.<name>` | `true` or `false`; `production` takes `{ sample }` from 0 to 1 | development and CI on |
| `project` | `key`, `name`, and `tags` | none |

`send`, `detail`, and `environments` decide what the diagnostics service is
sent, and the service is not built yet. They are recorded in every report, so a
dashboard knows what a project withheld. The relay runs on your own machine and
receives each run whole. A setting or a value that does not exist throws, and
names the closest that does.

**What the page requests**: the lint data, from `cdn`, once per page load, and
the relay, where `sinks.relay` is on. Nothing else leaves the page.

## In CI

`@fusion.dev/helix-diagnostics/ci` gathers the runs of a CI job into one JSON
file, in the shape every sink shares, and says whether the job should fail:

```js
import { ciSink } from '@fusion.dev/helix-diagnostics/ci'

// `runs` are the reports `diagnose` returned in each page your job opened.
const { code, summary } = ciSink(runs, { file: 'reports/helix-diagnostics.json' })
console.log(summary)
process.exitCode = code
```

A fault found on many pages is one line, with the pages it was on. `error`
findings fail the job by default; pass `failOn: 'warn'` to fail on warnings
too, or `'never'` to report without failing.

## Versions

`@fusion.dev/helix-core` lists its version on the page as it loads, and every
manifest built from 0.137 names the package and version it describes. Where
both sides say, a manifest from another version is one `manifest-skew`
finding in place of all others. Where either is silent, the check falls back
to a part rendering that the manifest does not list.

[Documentation](https://fusion.dev/helix)

MIT
