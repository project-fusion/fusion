# @fusion.dev/helix-theme

The theme derivation engine. Computes a complete, contrast-guaranteed token set
from a small set of intent inputs.

```sh
npm install @fusion.dev/helix-theme
```

```js
import { initTheme } from '@fusion.dev/helix-theme'

const engine = await initTheme('/helix/theme.wasm')
const theme = engine.derive({ brand: '#3b82f6' }, [':root'])

document.head.append(Object.assign(document.createElement('style'), {
  textContent: theme.css[':root'],
}))
```

Give it what you mean, a brand color and whatever else you have an opinion
about, and it returns every token the system needs with the contrast
relationships already satisfied, rather than a palette you then have to check.

**It has to be awaited and there is no way around that.** WebAssembly
instantiates asynchronously, so the engine is handed back from `initTheme`
rather than being importable: you cannot hold one without having waited for it.

The derivation is Rust and ships as WASM, so the same arithmetic runs in a
browser, in a build step and in the CLI, rather than two implementations
disagreeing by construction.

Zero dependencies and zero peers: it computes values and touches no DOM.

[Documentation](https://helix.fusion.dev) · [Theme builder](https://helix.fusion.dev/theme)

MIT
