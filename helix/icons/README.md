# @fusion.dev/helix-icons

The Helix icon set: 125 marks, 120 resolved from
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

Any set, not only ours. A subset of Phosphor larger than the 120 here is the
same command against the package it resolves from, and `--suffix` is for a set
that spells a weight into the file name:

```sh
npx helix-icons build \
  --source node_modules/@phosphor-icons/core/assets/bold --suffix -bold \
  --list mine.txt --out src/icons.ts
```

`--index` also writes the record `<helix-icon name>` reads. It names every glyph,
so nothing can drop any of it: ask for it when you want names in markup, and
leave it off when you import.

Phosphor is MIT and its notice travels in `LICENSE` beside ours.

[Documentation](https://fusion.dev/helix)

MIT
