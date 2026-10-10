# @fusion.dev/helix-icons

The Helix icon set: 126 marks, 121 resolved from
[Phosphor](https://phosphoricons.com) at build time and 5 of our own.

```sh
npm install @fusion.dev/helix-icons
```

```js
import { check } from '@fusion.dev/helix-icons'

const { content, name, viewBox } = check
```

One named export per mark, so a bundler drops every icon you did not ask for.

An icon is `{ content, name, viewBox }` and nothing else. There is nothing about
Phosphor in the data model, so a different set can answer the same shape, and
`<helix-icon>` draws whatever it is handed:

```jsx
<helix-icon icon={check} />
```

## Weight is a subpath

```js
import { caretDown } from '@fusion.dev/helix-icons/regular'
import { trash } from '@fusion.dev/helix-icons/bold'
```

Bold is the default, and `/bold` is the same set under a name that says so.
Phosphor's weights are outlined paths rather than strokes, so a weight is data
shipped rather than a dial to turn: a subpath is dropped per import site where
an attribute would put every weight in the lookup `<helix-icon name>` reads.

Every Helix component that draws a mark also offers a slot over it, so you can
put your own drawing in one place without replacing the package.

## Your own set

The generator that builds this set is the package's own command, so a folder of
SVG files becomes a module the element draws from:

```sh
npx helix-icons build --source ./brand-icons --out src/icons.ts
```

```tsx
import { peak } from './icons'

<helix-icon icon={peak} />
```

The command reads any set of SVG files. More of Phosphor than this package
carries is the same command against the package it resolves from, and
`--suffix` is for a set that spells a weight into the file name:

```sh
npx helix-icons build \
  --source node_modules/@phosphor-icons/core/assets/bold --suffix -bold \
  --list mine.txt --out src/icons.ts
```

`--index` also writes the record `<helix-icon name>` reads. It names every glyph,
so nothing can drop any of it: ask for it when you want names in markup, and
leave it off when you import.

An `--out` path ending in `.js` or `.mjs` gets JavaScript, with the type in a
JSDoc comment. Any other path gets TypeScript.

### From a script

The command is also a module, `@fusion.dev/helix-icons/build`, for a build
script of your own:

```js
import { build } from '@fusion.dev/helix-icons/build'

const written = build({
  out: 'src/icons.ts',
  sources: [{ directory: 'brand-icons' }],
})
```

`build` writes the module and returns how many icons it holds. Its options are
the command's flags:

- `sources`: where the SVG files are, searched in order, each as
  `{ directory, suffix }`;
- `names`: the icons to build, and every icon in the sources when left out;
- `out`: where to write the module;
- `index`: whether to also write the record `<helix-icon name>` reads;
- `typeImport`: where the module imports `HelixIcon` from.

It throws where the command fails:

- a source that is not a directory;
- a name with no file, or with a file in two sources;
- sources with no SVG files, when `names` is left out;
- an `out` path ending in `.cjs`.

Phosphor is MIT and its notice travels in `LICENSE` beside ours.

[Documentation](https://fusion.dev/helix)

MIT
