# @fusion.dev/helix

The styled component tier of Fusion Helix: the headless elements with
token-driven presentation on top. Custom elements, so they work in any framework
or in none.

```sh
npm install @fusion.dev/helix @fusion.dev/helix-styles
```

The elements need a bundler, such as Vite. They import their dependencies by
bare specifiers, which a browser resolves only through an import map. Import the
stylesheet and each family you use from your app's entry module:

```js
import '@fusion.dev/helix-styles/helix.css'
import '@fusion.dev/helix/button'
```

```html
<helix-button emphasis="solid" tone="primary">Save</helix-button>
```

Import each family from its subpath, as `@fusion.dev/helix/button` above. The
stylesheet is `@fusion.dev/helix-styles`' `helix.css`, which carries the tokens, the
base layer, and `elements.css`, the `:not(:defined)` rules that hide each element
until its definition loads.

Every component publishes its parts and its custom properties, so presentation is
adjustable from outside the shadow root without a fork.

Framework typings ship alongside: `@fusion.dev/helix/jsx`, `/vue` and `/svelte`.

Built on [`@fusion.dev/helix-headless`](https://www.npmjs.com/package/@fusion.dev/helix-headless),
which is the same behavior with no styling at all if you would rather bring your
own.

[Documentation](https://fusion.dev/helix) · [Components](https://fusion.dev/helix/components)

MIT
