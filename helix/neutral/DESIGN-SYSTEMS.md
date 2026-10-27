# Build a design system on the family compiler

`helix family` compiles families written in the neutral form into a web
stylesheet, an intermediate form, and a React Native component for each
element. Helix is the first design system written for it. You can write your
own: give it a prefix, a token file, and families, and draw it with Helix's
runtime or with one of your own.

The compiler runs in this repository's builds of `helix`. The commands below
are `bun run helix family …` from the repository.

## What a design system holds

| Path | What it is |
|---|---|
| `helix.family.json` | The project file: the prefix, the token source, where the families are, and where each command writes |
| `src/families/<family>/<element>/headless.tsx` | An element's props, events, states, features, and part tree, written as the [README](README.md) describes |
| `src/families/<family>/<element>/styled.ts` | The element's styled props and its style table |
| `src/fragments/<name>.ts` | Rules several families share, which a table takes in with `include()` |
| A token file | Your tokens, as a [Design Tokens Format Module](https://www.designtokens.org/tr/drafts/format/) file |
| A custom elements manifest | What your web elements declare, which `check` holds each source to |
| A folder of event classes | Your web events, which type each native event's detail |

`helix/cli/tests/fixtures/acme` is a small design system laid out this way,
with a badge, a button, and a tab set. The compiler's specs build it.

## The project file

`helix family` reads `helix.family.json` from the working directory or the
nearest directory above it, up to the repository root. `--config <path>`
names another. Every path in the file is relative to the file.

| Key | What it does |
|---|---|
| `name` | Your design system's name as a sentence writes it, such as `Acme` |
| `prefix` | The prefix of every tag, `acme-tabs`, and of every event and token unless the next two keys say otherwise |
| `eventPrefix` | The prefix the web sends each event under, `acme-activate` |
| `propertyPrefix` | The prefix of each token's custom property, `--acme-space-md` |
| `families` | The package that holds `src/families` and `src/fragments` |
| `tokens.dtcg` | Your token file |
| `tokens.modes` | A file for each mode that sets some tokens to another value, such as `{ "dark": "tokens/dark.tokens.json" }` |
| `tokens.styles` | A styles package laid out as Helix's, in place of `tokens.dtcg` |
| `tokens.vendor` | The key `design-tokens` writes your own data under in each `$extensions`, with `tokens.styles` |
| `theme` | The private values your page sets that a family may read with `inherited()`, each without its leading `_` |
| `manifest` | Your web elements' custom elements manifest |
| `events` | The folder of your web event classes |
| `outputs.build` | Where `build` writes `ir/` and `web/`. The families package's `dist` when you leave it out |
| `outputs.stylesheets` | The folder each element's `stylesheet` path is under |
| `outputs.components` | Where `components` writes `<family>/index.native.ts` |
| `outputs.tokens` | Where `tokens` writes each mode's native token module |
| `outputs.designTokens` | Where `design-tokens` writes the token file of a styles package |
| `runtime.native` | The module each native component imports the runtime from. `@fusion.dev/helix-native` when you leave it out |
| `runtime.eventType` | The type of the event a native handler hears, which the runtime exports. `HelixEvent` when you leave it out |
| `runtime.layerHost` | The component your app wraps itself in, as the anatomy names it. `HelixRoot` when you leave it out |
| `runtime.sources` | The runtime's own packages, `core` and `native`, for a design system that builds its runtime too |

`helix family` refuses a key it does not know, with the key and its line.
`helix family config` prints the project with every path made absolute and
every default filled in. `helix family config --schema` prints the file's
JSON Schema, which an editor validates the file with through `$schema`.

Acme's project file draws with Helix's runtime:

```json
{
  "events": "src/events",
  "families": ".",
  "manifest": "custom-elements.json",
  "name": "Acme",
  "outputs": {
    "build": "out/dist",
    "components": "out/native",
    "stylesheets": "out/styled",
    "tokens": "out/theme"
  },
  "prefix": "acme",
  "runtime": { "native": "@fusion.dev/helix-native" },
  "theme": ["acme-mode"],
  "tokens": {
    "dtcg": "tokens/acme.tokens.json",
    "modes": { "dark": "tokens/acme.dark.tokens.json" }
  }
}
```

Helix's own, at the repository root, names its styles package and the
packages of its runtime:

```json
{
  "events": "helix/core/src/events",
  "families": "helix/neutral",
  "manifest": "helix/styled/custom-elements.json",
  "name": "Helix",
  "outputs": {
    "build": "helix/neutral/dist",
    "components": "helix/styled/native",
    "designTokens": "helix/styles/dist",
    "stylesheets": "helix/styled/src",
    "tokens": "helix/native/src/theme"
  },
  "prefix": "helix",
  "runtime": {
    "eventType": "HelixEvent",
    "layerHost": "HelixRoot",
    "native": "@fusion.dev/helix-native",
    "sources": { "core": "helix/core", "native": "helix/native" }
  },
  "theme": ["helix-mode", "helix-mode-inverted"],
  "tokens": { "styles": "helix/styles", "vendor": "dev.fusion.helix" }
}
```

## The token file

A token is a member with a `$value`. Its name is its path joined with `-`:
`color.accent` is `color-accent`, which a style table reads as
`token('color-accent')` and the web writes as `var(--acme-color-accent)`.
`helix family` refuses a `token()` your file does not hold. A group's
`$type` is the type of each token in it that names none.

`helix family tokens` writes each token's value as the native theme takes it:

| `$type` | Native value |
|---|---|
| `color` | sRGB hex, from `hex` or the `srgb` components, with the alpha where it is not opaque |
| `dimension` | Points for `px`, and the CSS for `rem` and `em` |
| `duration` | Milliseconds, from `ms` or `s` |
| `number`, `fontWeight` | The number |
| `fontFamily` | The list as CSS writes it |
| `cubicBezier` | `cubic-bezier(…)` |
| `shadow` | The CSS shadow |

An alias, `{color.accent}`, is the value of the token it names. A type the
native theme has no kind for, such as `border` or `typography`, is refused
by the token's name.

A mode's file sets some tokens to another value. The native theme draws
`light` and `dark`, and a mode you do not name draws the main file's values.
Pass the modules to the theme your app wraps itself in, such as
`<HelixRoot tokens={{ dark, light }}>`.

## The authoring helpers

`@fusion.dev/helix-neutral` publishes the helpers your sources are written
with. The package is experimental, so its API can change.

```sh
bun add -d @fusion.dev/helix-neutral
```

| Entry point | What it holds |
|---|---|
| `@fusion.dev/helix-neutral/render` | `headless()`, the nodes of a part tree, and the helpers its props and events take |
| `@fusion.dev/helix-neutral/style` | The values a style table's declarations take, such as `token()` |
| `@fusion.dev/helix-neutral/table` | `styles()`, a table's groups and rules, and fragments |
| `@fusion.dev/helix-neutral/tree` | The features a source declares, and `derive()`, `bind()`, and `not()` |
| `@fusion.dev/helix-neutral/jsx-runtime` | The JSX runtime a `headless.tsx` render is typed with |

Set `jsxImportSource` to `@fusion.dev/helix-neutral` in your
`tsconfig.json`, so your editor types each render against the nodes in
`render`. Acme's `tsconfig.json` does this, and this repository's typecheck
runs it against the package's published entry points.

## Write families

Write each element as the [README](README.md) describes. What a design
system changes:

- **The tag is your prefix and the element's name.** `headless('tabs', …)`
  is `acme-tabs`, and `memberOf: set('tabs')` joins the element `acme-tabs`.
- **Each event is sent under your event prefix**, `acme-before-select`,
  unless the source marks it `bare`.
- **Each hook is the table's own `prefix` and the hook's name**, such as
  `--button-radius`, and each token is your property prefix and its name.
- **Your sources import the authoring helpers from
  `@fusion.dev/helix-neutral`**, as
  [the authoring helpers](#the-authoring-helpers) lists. The compiler reads
  the calls as syntax, so it reads a source whatever its import paths are.
- **Keep the keys of a source in the order they are read.** A formatter that
  sorts keys has to leave `headless.tsx` and `styled.ts` alone, as this
  repository's `biome.json` does for Helix's families and Acme's.

`helix family check` holds each element's attributes, events, slots, parts,
and custom states to your manifest. `helix family components` describes each
prop, slot, and event from it, and types each event's detail from your event
classes: a class that extends `CustomEvent<Detail>`, with `Detail` an
interface in the same folder.

## The runtime contract

The compiler writes no code for the web. Each generated stylesheet is adopted
by a web element you write, which has to draw what the sheet selects:

- its tag is the form's `tag`;
- each prop of its form is reflected as its attribute, so a rule on a prop's
  value holds;
- each custom state of its form's `api.states` is set in its
  `ElementInternals`, which `:state()` reads;
- its shadow root draws the form's tree, each part by its `part` name, each
  region as a slot, and each `data-` attribute the tree names;
- each event it sends is your event prefix and the event's name.

Helix's elements do this by extending `HelixElement` in
`@fusion.dev/helix-core`, through a headless class.

On React Native the compiler writes a module per family, which imports the
runtime `runtime.native` names. `helix/native/src/contract.ts` types what it
imports, and `@fusion.dev/helix-native` exports the types:

| Type | What the runtime provides |
|---|---|
| `NativeRuntime` | `element`, `behaviorFor`, and `webOnly`, which each module calls once for each element |
| `ElementEvent` | The event a handler hears, exported under the name `runtime.eventType` gives |
| `PlatformElementEvent` | An event the web sends as the platform's own, exported as `PlatformEvent` |
| `FieldHandleContract` | A form control's handle, exported as `FieldHandle` |
| `LayerHostProps` | What the component `runtime.layerHost` names takes, with your token values for each mode |

The form's `machines` names each behavior an element runs, and `derive()`
names a value the runtime computes. Helix's runtime computes each derivation
in `helix/core/src/utils/derivations` and binds the machines it draws on a
phone. A runtime of your own binds the machines it can draw, and a machine it
does not bind does nothing.

To build on Helix's runtime, leave `runtime` out, or name
`@fusion.dev/helix-native`. To write your own, export what the contract
types, name your module in `runtime.native`, and import the types with
`import type` so nothing of Helix's runtime is bundled. Helix's runtime is
held to the contract by `helix/native/tests/contract/provides.ts`.

A form names another element by its tag, under your prefix: the element a
box `draws`, such as `acme-badge` for Acme's `draws="badge"`, and the
elements a `total` sums. A runtime finds each by the tag the form gives it,
so both features work under any prefix.

## Commands

| Command | Reads | Writes |
|---|---|---|
| `helix family build` | `families`, `tokens` | `outputs.build`: each element's form and web stylesheet |
| `helix family stylesheets` | `families`, `tokens` | `outputs.stylesheets`: each element's generated stylesheet |
| `helix family check` | `families`, `manifest` | Nothing. It says where an element differs from the manifest |
| `helix family components` | `families`, `manifest`, `events`, `runtime` | `outputs.components`: each family's native module |
| `helix family platforms` | `families`, `manifest` | Prints each element's names on React Native |
| `helix family anatomy` | `families`, `runtime` | Prints each element's tree on each platform |
| `helix family tokens` | `tokens` | `outputs.tokens`: each mode's native token module |
| `helix family design-tokens` | `tokens.styles` | `outputs.designTokens`: the token file of a styles package |
| `helix family types` | Nothing | `runtime.sources.native`: the form's TypeScript types |
| `helix family machines` | `runtime.sources.core` | Each machine's compiled module |
| `helix family capabilities` | Nothing | `runtime.sources.core`: each capability's contract |
