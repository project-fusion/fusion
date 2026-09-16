# @fusion.dev/helix-headless

The headless component tier: structure, accessibility, keyboard behavior, state
and form participation, with no styling of any kind.

```sh
npm install @fusion.dev/helix-headless
```

```html
<script type="module">
  import '@fusion.dev/helix-headless'
</script>

<helix-headless-switch
  hint="We will only mail you about outages"
  label="Notify me"
  name="notify"
></helix-headless-switch>
```

Nothing here paints. Every part is published as a `::part()` so a consumer's own
stylesheet is the only thing deciding how a component looks, and every family
carries the ARIA, focus management and form association that are tedious to get
right and invisible when they are wrong.

This is the tier to take if you are building your own design system rather than
adopting ours. [`@fusion.dev/helix`](https://www.npmjs.com/package/@fusion.dev/helix)
is this tier with our presentation on top.

Framework typings ship alongside: `/jsx`, `/vue` and `/svelte`.

[Documentation](https://fusion.dev/helix) · [Building on the headless tier](https://fusion.dev/helix/docs/building-on-the-headless-tier)

MIT
