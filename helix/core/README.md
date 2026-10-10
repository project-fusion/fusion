# @fusion.dev/helix-core

The base classes, mixins, and utilities that both Helix tiers are built from:
[`@fusion.dev/helix-headless`](https://www.npmjs.com/package/@fusion.dev/helix-headless)
and [`@fusion.dev/helix`](https://www.npmjs.com/package/@fusion.dev/helix).

```sh
npm install @fusion.dev/helix-core
```

You get it with either tier, and most pages never import it by name. The base
classes and mixins are there for the Helix components and change with them. The
bridge that repairs how React hydrates custom events runs inside every element,
with nothing to import. See [React](https://fusion.dev/helix/docs/react).

A few exports are for your own code:

- `registerWords` translates the words the components say. Import it from
  `@fusion.dev/helix/words`, which types each call against the styled families.
  See [Localization](https://fusion.dev/helix/docs/localization).
- `pauseMotion` pauses the motion of every component on the page, and
  `pauseMotion(false)` lets it run again. See
  [Motion](https://fusion.dev/helix/docs/motion).
- `duplicateRegistrations` lists each tag that two classes asked to register,
  which is what two copies of Helix on one page look like.
  `@fusion.dev/helix-diagnostics` reports the same list.
- The event classes the elements dispatch, such as `HelixBeforeChangeEvent`,
  type a handler. An editor of your own sends `HelixBeforeEditEvent` to a
  sandbox. See [Sandbox](https://fusion.dev/helix/docs/sandbox).

```js
import { duplicateRegistrations } from '@fusion.dev/helix-core'

console.log(duplicateRegistrations())
```

[Documentation](https://fusion.dev/helix)

MIT
