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
        {/* **A mark, because it is the one place the brand appears as itself.**
            Everywhere else on this page the brand is solved for a word: the
            button fill has to carry white and the link colour has to clear the
            page as text. `--helix-color-brand-mark` answers to the 3:1 a graphic
            owes rather than the 4.5 a word does, so a reader who picks a colour
            can find it here even when every button has moved away from it.

            Drawn rather than pictured: a mark that is one shape and one fill is
            CSS, and an asset would need loading, sizing and a licence to say the
            same thing. `aria-hidden`, the name beside it being the accessible
            one, so a screen reader is not told the company twice. */}
        <helix-flex align="center" gap="xs" slot="start">
          <span aria-hidden="true" className="themedMark" />
          <helix-text appearance="label">Halyard</helix-text>
        </helix-flex>
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

      {/* A form, a table and an overlay: the three shapes a landing page's
          screenshots are usually of, and the three that put the rest of the
          palette on screen. A page of headings and buttons exercises four
          tokens; a page with a control in an invalid state, a row that reads as
          selected and a panel over the top exercises most of them. */}
      <helix-grid className="themedSplit" columns={2} gap="lg">
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text appearance="subheading" as="h2">
              Start a trial
            </helix-text>
            {/* `default-value`, not `value`: declaring `value` claims ownership and the
                control announces and applies nothing until it is answered. This is a
                picture of a filled field, so it is seeded. */}
            <helix-input
              default-value="ada@example.com"
              label="Work email"
              name="email"
            ></helix-input>
            {/* `feedback` and not an `invalid` attribute, which does not exist:
                the styled tier keys its wrong-state off `data-invalid`, which the
                component writes from the same validity that decides the message.
                Markup claiming it would be setting a mirror the component owns
                and overwrites. What a preview can honestly show is the message. */}
            <helix-input
              default-value="Example"
              feedback="That domain is already on a plan."
              label="Company"
              name="company"
              required
            ></helix-input>
            <helix-checkbox name="terms">Send me the release notes</helix-checkbox>
            <helix-flex gap="sm">
              <helix-button appearance="solid" tone="primary">
                Create account
              </helix-button>
              <helix-button appearance="ghost">Talk to us</helix-button>
            </helix-flex>
          </helix-flex>
        </helix-card>

        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text appearance="subheading" as="h2">
              Recent themes
            </helix-text>
            <helix-table label="Recent themes">
              <helix-table-column slot="columns">Name</helix-table-column>
              <helix-table-column slot="columns">Target</helix-table-column>
              <helix-table-column slot="columns">State</helix-table-column>
              {(
                [
                  { name: 'Halyard', state: 'success', target: '4.5:1', word: 'Passing' },
                  {
                    name: 'Halyard dark',
                    state: 'warning',
                    target: '4.5:1',
                    word: 'One collision',
                  },
                  { name: 'Archive', state: 'danger', target: '7:1', word: 'Two failures' },
                ] as const
              ).map((row) => (
                <helix-table-row key={row.name}>
                  <helix-table-cell>{row.name}</helix-table-cell>
                  <helix-table-cell>{row.target}</helix-table-cell>
                  <helix-table-cell>
                    <helix-tag appearance="subtle" tone={row.state}>
                      {row.word}
                    </helix-tag>
                  </helix-table-cell>
                </helix-table-row>
              ))}
            </helix-table>
            <helix-flex align="center" gap="sm">
              <helix-progress value={68}></helix-progress>
              <helix-text appearance="caption">68% of pairs measured</helix-text>
            </helix-flex>
          </helix-flex>
        </helix-card>
      </helix-grid>

      <helix-callout severity="success">
        <helix-text>
          Every pair on this page clears its target, and the ones that could not be measured are
          named rather than skipped.
        </helix-text>
      </helix-callout>
    </div>
  )
}
