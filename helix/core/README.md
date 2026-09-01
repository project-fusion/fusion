# @fusion.dev/helix-core

The primitives both Helix tiers are built from: base classes, mixins, decorators
and utilities.

```sh
npm install @fusion.dev/helix-core
```

Useful directly if you are writing custom elements that need to sit alongside
Helix and behave the same way — controlled properties that answer, a single
page-wide ticker rather than one timer per element, scroll-parent resolution that
crosses shadow boundaries, and duplicate-registration detection.

```js
import { duplicateRegistrations } from '@fusion.dev/helix-core'

// Two copies of a library on one page is silent: the first registration keeps
// the tag and `instanceof` against the second is quietly false.
console.log(duplicateRegistrations())
```

Most consumers get this transitively through
[`@fusion.dev/helix`](https://www.npmjs.com/package/@fusion.dev/helix) or
[`@fusion.dev/helix-headless`](https://www.npmjs.com/package/@fusion.dev/helix-headless)
and never import it by name.

[Documentation](https://helix.fusion.dev)

MIT
