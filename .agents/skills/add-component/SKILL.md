---
name: add-component
description: Adds a component to the Helix design system, across the headless and styled tiers, with tokens, specs, manifest metadata, and the framework typings the analyzer emits. Use when creating a new Helix component or part, adding a part to an existing component family, or when the user mentions Helix components, helix/headless, helix/styled, or a component name like Button, Tabs, or Dialog.
---

# Adding a Helix component

Conventions live in `helix/CONVENTIONS.md` and load automatically. This is the
procedure.

## Checklist

```
- [ ] 1. Decide the family, parts, and whether it is form-associated
- [ ] 2. Headless tier: structure, ARIA, state
- [ ] 3. Styled tier: CSS file plus the element
- [ ] 4. Barrels
- [ ] 5. Specs: dom, ssr, and any pure-logic
- [ ] 6. Verify
```

## 1. Decide the shape

- **Family and parts.** A part per folder:
  `helix/<tier>/src/<family>/<part>/<family>-<part>.ts`. `Root` is the family's
  primary element.
- **A group is a part when it reports a form value** (`Radio.Group`,
  `Toggle.Group`), and its own family when it does not (`Checkbox Group`,
  `Button Group`). A container holding mixed content is its own family
  (`Toolbar`). Not "where homogeneous": that is a fact about the members rather
  than about the group, and by it `Checkbox Group` and `Button Group` would both
  be violations.
- **Form-associated?** Extend `HelixFormElement`, not `HelixElement`.
  `formAssociated` must be a class field: it cannot be a controller.
- **Reuse a mixin** if the component has open, checked, value, disabled, or
  selection state. Do not reimplement the controlled/uncontrolled contract.

## 2. Headless tier

`helix/headless/src/<family>/<part>/<family>-<part>.ts`

- Class `HelixHeadless<Family><Part>`, tag `helix-headless-<family>-<part>`.
- Structure, ARIA, slots, events. **No CSS, no tokens.**
- Every structural element gets `part="…"`.
- Class JSDoc carries the full contract: `@summary`, `@description`, `@since`,
  `@status`, `@documentation`, plus `@slot`, `@csspart`, and
  `@event {EventClass}` where applicable. The linter fails the build without the
  first five.
- Each `@property` gets a one-line description.

New event? Add a class to `helix/core/src/events/events.ts` carrying its own
`eventName` and augmenting `HTMLElementEventMap`, then reference it as
`@event {HelixThingEvent} thing-change - …`.

**Watch the SSR rules in `helix/CONVENTIONS.md`.** State seeded in
`connectedCallback` does not exist on the server, and `querySelector` is
undefined there.

## 3. Styled tier

`helix/styled/src/<family>/<part>/<family>-<part>.ts` plus a sibling `.css`.

- Class `Helix<Family><Part>` extending the base, tag `helix-<family>-<part>`.
- Presentation only, and the properties are the visual axes: `emphasis`,
  `material`, `separation`, `tone`. **`appearance` is refused outright** by
  `helix component`'s `axes` and is not a word this library uses; `dense` is not one either,
  since size comes from `data-density` on the region.
- Styles in the `.css` file, imported as `./​<family>-<part>.css.js`:

```ts
import { styles } from './card-root.css.js'

static override styles: CSSResultGroup = styles
```

- Use semantic tokens only. Expose per-component hooks that default to one:
  `padding: var(--card-padding, var(--helix-space-md))`.

## 4. Barrels

Each family's `index.ts` re-exports its parts; the package `index.ts` re-exports
each family.

## 5. Specs

| File | Runs in | Asserts |
|---|---|---|
| `<name>.dom.spec.ts` | happy-dom | Behavior after hydration |
| `<name>.ssr.spec.ts` | Lit SSR | The **server** output carries the right state |

The two cannot share a process, which is why the filenames differ.

An ARIA spec must **resolve** the reference, not compare the attribute to an id.
A comparison passes on a reference that can never resolve:

```ts
const scope = element.getRootNode() as Document | ShadowRoot
expect(scope.getElementById(element.getAttribute('aria-labelledby'))).toBe(title)
```

## 6. Verify

```bash
bun run fix && bun run verify
```

`build` runs `turbo run styles` and `analyze`, and `analyze` is what regenerates the
framework typings: `jsx.d.ts`, `vue.d.ts` and `svelte.d.ts`, in `helix/styled`,
emitted by cem plugins. **There are no React wrappers and there is no
`helix/react`.** Inspect the generated typings and confirm the properties and the
typed event callbacks appear as expected.

If the linter rejects the component, it is naming a missing convention. Fix the
component rather than the linter.
