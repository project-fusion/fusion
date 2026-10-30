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

Then it does two things in order:

1. **Writes `custom-elements.json`** with `helix manifest build`, against the
   manifests of every helix package reachable through `dependencies`.
2. **Writes the framework typings**, where `frameworkTypes` is set:
   `types/jsx.d.ts`, `types/vue.d.ts`, `types/svelte.d.ts` and
   `types/words.d.ts`, each a template over the manifest in
   [src/typings](src/typings). The classes are the source of each prop's type,
   `HelixPagination["defaultPage"]`, so a prop cannot drift from its property.

**It used to be the configuration for `@custom-elements-manifest/analyzer`,**
and eighteen plugins for it. Ten of those built the manifest, and the Rust
generator does that work as ordinary code now, byte for byte what the analyzer
wrote. What is left here is what reads a finished manifest, which never parsed
any TypeScript. The linter it also held is `helix component`'s `conventions`
rule now, which is what [the JSDoc contract](../CONVENTIONS.md#jsdoc-contract)
is checked by.

## The typings are tested in each framework

`typings/` holds a project per framework: React, Preact, and Solid on `tsc`, Vue
on `vue-tsc`, and Svelte on `svelte-check`. `bun run smoke:typings` packs the
packages, installs them into each project outside the repository, and checks it
with `skipLibCheck` off.

Each project writes good usage, and bad usage under a guard:

- a value outside an enum
- a misspelled property, and a misspelled event
- a `detail` field the event does not carry
- a word for a numeric attribute
- an `@internal` coordination member, `focusable`
- a removed name, `helix-toggle` and `HelixToggleEvent`

A guarded line that compiles fails the run, and so does an error on any other
line. `bun run smoke:typings --list` prints every guarded line with the error it
raises. [run-typings-test.mjs](../../fusion/scripts/run-typings-test.mjs) says how
the guards are judged.

**A misspelled event written as a JSX prop compiles, and no emitted type can
change that.** TypeScript treats a JSX attribute whose name holds a dash as known
whatever the element's props say, so `onhelix-before-chek` and Solid's
`on:helix-before-chek` compile on every tag. On TypeScript 7.0.2 a pattern index
signature such as `` [key: `onhelix-${string}`]: never `` is not consulted for
such a name, alone, in an intersection, or through a mapped type, and the mapped
forms also lose the type of the handlers they declare. The JSX projects catch the
misspelling through `addEventListener`, which reads the event map, and an element
warns in a development build. Vue, with `strictTemplates`, and Svelte refuse it in
the template.

**`defaultPage="2"` compiles in Vue.** `vue-tsc` reads a kebab attribute that has
a value as its camelCase property, so the numeric string that `default-page="2"`
needs is on `defaultPage` too. Vue assigns the second spelling as a string
property, and the checker cannot tell the two apart. `default-page="abc"` is still
refused.

**Vue passes an unknown prop unless the project sets `strictTemplates`.** That is
a setting of the consumer's project, which the typings cannot reach.
