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

- **`coverage`**: how many stylesheets and shadow roots were read, and which
  sheets could not be. A cross-origin stylesheet throws on `.cssRules`, so a run
  that read three sheets of nineteen returns the same empty findings as one that
  read all nineteen. Read `coverage` before you believe `findings`.
- **`findings`**: each with its kind, a severity, the layer that set the
  severity, the tag, and the rule's own text as evidence.
- **`silenced`**: how many findings each override layer turned off.
- **`usage`**: the Helix elements on the page by tag, the axes set on them
  (`emphasis`, `material`, `separation`, and `tone`), the named slots filled,
  the elements Helix renders inside other Helix elements, and the parts and
  hooks your stylesheets use. With a watcher it counts every element that
  rendered since `watch()` began, including ones since removed, such as a
  closed dialog. Without one it counts the elements on the page at the moment
  of the run. Elements named `helix-*` that no manifest lists, such as your
  own, are counted apart as `unlisted`.

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
| `dead-hook` | error | A custom property is set where nothing answers it |
| `unforwarded-part` | warn | The headless tier publishes the part and the styled tier does not forward it, which is a gap in Helix |
| `unknown-tag` | error | A rule names a tag no manifest lists |
| `duplicate-registration` | error | Two copies of Helix are on the page |
| `manifest-skew` | error | An element renders a part its manifest does not list, so the manifest is from another version. It replaces every other finding, since each would be judged against the wrong version. Turned off, the page is judged as usual |

## Change a severity

Pass your project's file, parsed, as `file`, and overrides for one run as
`rules`. The `rules` argument wins over the file, and each finding says which
one set its severity. An override is a severity (`error`, `warn`, or `info`),
`off`, or either for some tags only:

```js
import overrides from './helix-diagnostics.json' with { type: 'json' }

diagnose({
  file: overrides,
  rules: {
    'dead-hook': { severity: 'warn', tags: ['helix-card'] },
    'unforwarded-part': 'off',
  },
  tiers,
})
```

An override for a kind that does not exist throws, and names the closest kind.

Development only. It walks every stylesheet in the page, and it sends nothing
anywhere.

[Documentation](https://fusion.dev/helix)

MIT
