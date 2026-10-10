# @fusion.dev/helix-styles

Design tokens and the base layer. Pure CSS and a JSON copy of the tokens. No
JavaScript at all.

```sh
npm install @fusion.dev/helix-styles
```

```css
@import '@fusion.dev/helix-styles/helix.css';
```

Or take the pieces, in the order of the first four rows:

| Entry | What it is |
|---|---|
| `primitives.css` | the raw color ramps and scales the tokens are derived from, where the `--helix-seed-*` properties are read. No classes |
| `tokens.css` | the semantic custom properties, light and dark. They read the primitives, so without `primitives.css` every color resolves to nothing |
| `base.css` | the element reset and defaults |
| `elements.css` | hides each Helix element until its definition loads |
| `helix.css` | the four files above, in that order |
| `tokens.json` | the same token names for a build step that needs them |

The tokens are the contract every Helix component reads, so overriding one here
moves every component that answers it.

[Documentation](https://fusion.dev/helix) · [Token reference](https://fusion.dev/helix/docs/tokens)

MIT
