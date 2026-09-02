# @fusion.dev/helix-styles

Design tokens and the base layer. Pure CSS and a JSON copy of the tokens. No
JavaScript at all.

```sh
npm install @fusion.dev/helix-styles
```

```css
@import '@fusion.dev/helix-styles/all.css';
```

Or take the pieces:

| Entry | What it is |
|---|---|
| `tokens.css` | the custom properties, light and dark |
| `base.css` | element defaults and the reset |
| `primitives.css` | utility layer |
| `all.css` | all three, in order |
| `tokens.json` | the same token names for a build step that needs them |

The tokens are the contract every Helix component reads, so overriding one here
moves every component that answers it.

[Documentation](https://helix.fusion.dev) · [Token reference](https://helix.fusion.dev/tokens)

MIT
