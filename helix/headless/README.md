# @fusion.dev/helix-headless

The headless component tier: structure, accessibility, keyboard behavior, state
and form participation, with no styling of any kind.

```sh
npm install @fusion.dev/helix-headless
```

```js
import '@fusion.dev/helix-headless/switch'
```

```html
<helix-headless-switch
  hint="We will only mail you about outages"
  label="Notify me"
  name="notify"
></helix-headless-switch>
```

Each family has its own subpath, such as `@fusion.dev/helix-headless/switch`,
and importing it registers that family's elements. Import the subpaths you use.
`import '@fusion.dev/helix-headless'` registers every element in the tier, which
puts the whole tier in your bundle.

Nothing here paints. Every part is published as a `::part()` so a consumer's own
stylesheet is the only thing deciding how a component looks, and every family
carries the ARIA, focus management and form association that are tedious to get
right and invisible when they are wrong. Each `live` part holds words for a
screen reader to announce and shows them on the page, so your stylesheet hides
it visually, as the styled tier does.

This is the tier to take if you are building your own design system rather than
adopting ours. [`@fusion.dev/helix`](https://www.npmjs.com/package/@fusion.dev/helix)
is this tier with our presentation on top.

Framework typings ship alongside: `/jsx`, `/vue` and `/svelte`.

[Documentation](https://fusion.dev/helix) · [Building on the headless tier](https://fusion.dev/helix/docs/building-on-the-headless-tier)

MIT
