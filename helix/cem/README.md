# @fusion.dev/helix-cem

What runs over a Helix manifest once `helix manifest build` has written it.
**Private**: build tooling for this repository.

A package's `analyze` is `bun --bun helix-cem`, run from its own directory. It
reads `cem.config.ts` for three things, and finds the rest:

```ts
import type { HelixCemOptions } from '@fusion.dev/helix-cem'

const config: HelixCemOptions = {
  frameworkTypes: true,
  packageName: '@fusion.dev/helix',
  tier: 'styled',
}

export default config
```

Then it does three things in order:

1. **Writes `custom-elements.json`** with `helix manifest build`, against the
   manifests of every helix package reachable through `dependencies`.
2. **Lints it.** `helix-convention-lint` fails the build on a component
   missing `@since`, `@status`, `@documentation` or a description, among other
   conventions: see [the JSDoc contract](../CONVENTIONS.md#jsdoc-contract).
3. **Writes the framework typings**, where `frameworkTypes` is set:
   `types/jsx.d.ts`, `types/vue.d.ts` and `types/svelte.d.ts`, with
   `@wc-toolkit/jsx-types` and `@wc-toolkit/vuejs-types` and the `jsx-*`
   passes that correct what those write.

**It used to be the configuration for `@custom-elements-manifest/analyzer`,**
and eighteen plugins for it. Ten of those built the manifest, and the Rust
generator does that work as ordinary code now, byte for byte what the analyzer
wrote. What is left here is what reads a finished manifest, which never parsed
any TypeScript and so never carried the version pin that replacing the
analyzer ended.
