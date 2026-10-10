# @fusion.dev/helix-theme

The theme derivation engine. Computes a complete token set from a small set of
intent inputs, and measures every text and background pair in its surface model
against its contrast target.

```sh
npm install @fusion.dev/helix-theme
```

Give it what you mean, a brand color and whatever else you have an opinion
about, and it returns the tokens with each text color solved against the
backgrounds it lands on. A pair that cannot meet its target, such as one with a
color you pinned, is reported in `violations`. `foreground-subtle` is not
solved: it is a fixed step of the stylesheet's gray ramp, and its contrast is
not guaranteed. With no brand, the theme is ink: near-black on a light page and
near-white on a dark one.

## Load the engine

The engine is WebAssembly. The module is in the package at
`wasm/fusion_helix_theme_bg.wasm`, exported as
`@fusion.dev/helix-theme/wasm/fusion_helix_theme_bg.wasm`. Serve that file from
your app, and pass its URL to `initTheme`:

```js
import { initTheme } from '@fusion.dev/helix-theme'

const engine = await initTheme(wasmUrl)
```

With Vite, a `?url` import is one way to serve it. Vite copies the file into
your build and gives you its URL:

```js
import wasmUrl from '@fusion.dev/helix-theme/wasm/fusion_helix_theme_bg.wasm?url'
```

In Node, pass the file's bytes:

```js
import { readFile } from 'node:fs/promises'
import { initTheme } from '@fusion.dev/helix-theme'

const engine = await initTheme(
  await readFile(new URL(import.meta.resolve('@fusion.dev/helix-theme/wasm/fusion_helix_theme_bg.wasm'))),
)
```

**It has to be awaited and there is no way around that.** WebAssembly
instantiates asynchronously, so the engine is handed back from `initTheme`
rather than being importable: you cannot hold one without having waited for it.

## Theme a page

```js
const { css, dark, light } = engine.deriveModes({ brand: '#3b82f6' }, [':root'])

document.head.append(Object.assign(document.createElement('style'), {
  textContent: css[':root'],
}))
```

`deriveModes` derives the intent in light and dark mode and renders one block
with each color as a `light-dark()` pair, so the page follows the reader's color
mode. Each mode's theme comes back as well, as `light` and `dark`, with its own
`violations`. `derive` derives one mode, for a theme that has only one, such as
a section in a color of its own.

The derivation is Rust and ships as WASM, so the same arithmetic runs in a
browser, in a build step and in the CLI, rather than two implementations
disagreeing by construction.

Zero dependencies and zero peers: it computes values and touches no DOM.

[Documentation](https://fusion.dev/helix) · [Theme builder](https://fusion.dev/helix/theme)

MIT
