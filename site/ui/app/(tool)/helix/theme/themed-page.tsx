/**
 * What the preview shows: a landing page, not a row of samples.
 *
 * **A palette is judged in composition, not in isolation.** The first version
 * held a card, a callout, some tags and a popover, which answers "what colour
 * is a tag" and not "would I ship this". Contrast between an ink and its ground
 * is measured by the engine and reported in the audit; what a reader is here to
 * judge is the thing the audit cannot see, which is whether the palette holds
 * together across a page of real hierarchy.
 *
 * So: a header, a hero, a row of features, a band of figures, and a close. Each
 * one lands on a different surface, which is also what puts every ground in the
 * model on screen at once rather than one at a time.
 *
 * Static markup on purpose. It takes no props and holds no state, so it renders
 * once and every change a reader makes reaches it through inherited custom
 * properties rather than through React.
 */
export function ThemedPage() {
  return (
    <div className="themedPage">
      <helix-app-header className="themedHeader">
        <helix-text appearance="label" slot="start">
          Northwind
        </helix-text>
        {/* Plain anchors carrying `data-navigation-item`, which is the base
            layer's helper for exactly this: `helix-navigation` is the landmark
            and takes whatever is slotted into it, and there is no item element
            to reach for. */}
        {/* Wrapped, because the container query below hides it and a document
            rule setting `display` on the component would kill the component's
            own: a shadow rule loses to a document rule whatever the specificity
            and whatever the layer. The wrapper is this file's to hide. */}
        <div className="themedNav">
          <helix-navigation label="Product">
            <a data-navigation-item href="#product">
              Product
            </a>
            <a data-navigation-item href="#pricing">
              Pricing
            </a>
            <a data-navigation-item href="#docs">
              Docs
            </a>
          </helix-navigation>
        </div>
        <helix-flex align="center" gap="xs" slot="end">
          <helix-button appearance="ghost">Sign in</helix-button>
          <helix-button appearance="solid" tone="primary">
            Start free
          </helix-button>
        </helix-flex>
      </helix-app-header>

      <helix-flex className="themedHero" direction="column" gap="md">
        <helix-tag appearance="subtle" tone="accent">
          Now in general release
        </helix-tag>
        <helix-text appearance="display" as="h1">
          Ship the interface, not the argument about it.
        </helix-text>
        <helix-text appearance="body">
          One colour in, a whole palette out, and every foreground measured against the ground it
          actually lands on rather than against the page alone.
        </helix-text>
        <helix-flex gap="sm">
          <helix-button appearance="solid" tone="primary">
            Start free
          </helix-button>
          <helix-button appearance="outlined">Read the derivation</helix-button>
        </helix-flex>
      </helix-flex>

      <helix-grid className="themedFeatures" columns={3} gap="md">
        {[
          {
            body: 'Foregrounds are solved for their target, not picked and then audited.',
            title: 'Contrast by construction',
          },
          {
            body: 'Change the brand and the charts, the tints and the borders move with it.',
            title: 'One seed, one palette',
          },
          {
            body: 'Every pair it could not measure says so, rather than going quiet.',
            title: 'Honest about the gaps',
          },
        ].map((feature) => (
          <helix-card key={feature.title}>
            <helix-flex direction="column" gap="xs">
              <helix-text appearance="subheading" as="h2">
                {feature.title}
              </helix-text>
              <helix-text appearance="caption">{feature.body}</helix-text>
            </helix-flex>
          </helix-card>
        ))}
      </helix-grid>

      {/* A recessed band, so `surface-sunken` is on screen beside the others
          rather than being the one ground nobody looks at. */}
      <helix-flex className="themedFigures" gap="lg" justify="between">
        {/* The figure is the default slot and the label is slotted beside it;
            neither is an attribute, which is the content-property rule the area
            notes state. */}
        {[
          { label: 'Pairs measured', value: '63' },
          { label: 'Contrast floor', value: '4.5:1' },
          { label: 'Colours to pick', value: '1' },
          { label: 'Audits to book', value: '0' },
        ].map((figure) => (
          <helix-stat key={figure.label}>
            {figure.value}
            <span slot="label">{figure.label}</span>
          </helix-stat>
        ))}
      </helix-flex>

      <helix-callout severity="success">
        <helix-text>
          Every pair on this page clears its target, and the ones that could not be measured are
          named rather than skipped.
        </helix-text>
      </helix-callout>
    </div>
  )
}
