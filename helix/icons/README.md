# @fusion.dev/helix-icons

The Helix icon set: 105 marks resolved from [Phosphor](https://phosphoricons.com)
at build time, plus the few that are ours.

```sh
npm install @fusion.dev/helix-icons
```

```js
import { check } from '@fusion.dev/helix-icons'

const { content, name, viewBox } = check
```

One named export per mark, so a bundler drops every icon you did not ask for.

An icon is `{ content, name, viewBox }` and nothing else. There is nothing about
Phosphor in the data model, so a different set can answer the same shape.

Every Helix component that draws a mark also offers a slot over it, so you can
put your own drawing in one place without replacing the package.

Phosphor is MIT and its notice travels in `LICENSE` beside ours.

[Documentation](https://helix.fusion.dev)

MIT
