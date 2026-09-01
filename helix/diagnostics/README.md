# @fusion.dev/helix-diagnostics

Finds the Helix mistakes that are valid CSS and therefore silent: a `::part()`
naming a part nothing publishes, a custom property named for the wrong family, a
part a composed component never forwarded, two copies of the library on one page.

```sh
npm install --save-dev @fusion.dev/helix-diagnostics
```

```js
import { diagnose, report } from '@fusion.dev/helix-diagnostics'
import headless from '@fusion.dev/helix-headless/custom-elements.json' with { type: 'json' }

report(diagnose({ tiers: [headless] }))
```

`diagnose` needs at least one manifest and says so rather than defaulting: with
none, every part name is unknown and every finding would be noise. `report` is
the console sink; the `Report` it returns is the same object, so you can send it
somewhere else instead.

None of these produces an error anywhere. They are detectable only against the
custom elements manifest, which every Helix package already publishes, so the
diagnostic cannot drift from what is true.

**Coverage is half the return value, not a footnote.** A cross-origin stylesheet
throws on `.cssRules`, so a run that read three sheets of nineteen returns the
same empty findings array as one that read all nineteen. Read `coverage` before
you believe `findings`.

Development only. It walks stylesheets in the page and makes no network calls,
ever.

[Documentation](https://helix.fusion.dev)

MIT
