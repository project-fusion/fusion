# @fusion.dev/helix-diagnostics

Finds the Helix mistakes that are valid CSS and therefore silent: a `::part()`
naming a part nothing publishes, a custom property named for the wrong family, a
part a composed component never forwarded, two copies of the library on one page.

```sh
npm install --save-dev @fusion.dev/helix-diagnostics
```

```js
import { diagnose, report, watch } from '@fusion.dev/helix-diagnostics'
import { duplicateRegistrations } from '@fusion.dev/helix-core'
import styled from '@fusion.dev/helix/custom-elements.json' with { type: 'json' }
import headless from '@fusion.dev/helix-headless/custom-elements.json' with { type: 'json' }

// Before the components load, so every element that renders is counted.
const watcher = watch()

// Later, once the page has rendered, and again after a route change.
report(
  diagnose({
    duplicates: duplicateRegistrations,
    tiers: [
      { manifest: styled, name: '@fusion.dev/helix' },
      { manifest: headless, name: '@fusion.dev/helix-headless' },
    ],
    watcher,
  }),
)
```

`diagnose` needs at least one manifest and says so instead of defaulting: with
none, every part name is unknown and every finding would be noise. Pass both
tiers when both are installed, since a part the headless tier publishes and the
styled tier never forwarded is only visible with both. `report` is the console
sink; the `Report` it returns is the same object, so you can send it somewhere
else as well.

None of these produces an error anywhere. They are detectable only against the
custom elements manifest, which every Helix package already publishes, so the
diagnostic cannot drift from what is true.

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
| Stylesheets that could not be read | `console.warn` |
| Coverage, and findings turned off | `console.info` |
| Usage | `console.debug`, hidden at the default level |

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
| `send.<category>` | `true` or `false`, for `findings`, `usage`, `coverage`, `configuration`, `runtime`, `performance`, and `assist` | all on but `performance` |
| `detail.evidence` | `full`, `selector`, or `none` | `full` |
| `detail.hookValues` | `true` or `false` | `true` |
| `detail.pages` | `patterns`, `full` (the path, never the query), or `none` | `patterns` |
| `environments.<name>` | `true` or `false`; `production` takes `{ sample }` from 0 to 1 | development and CI on |
| `project` | `key`, `name`, and `tags` | none |

`send`, `detail`, and `environments` decide what a sending sink sends, and
nothing here sends yet: they are recorded in every report, so a dashboard
knows what a project withheld. A setting or a value that does not exist
throws, and names the closest that does.

Development only. It walks every stylesheet in the page, and it sends nothing
anywhere.

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
