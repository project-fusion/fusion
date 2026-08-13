import { families } from '../../lib/catalog'

export default function Home() {
  const examples = families.reduce((total, family) => total + family.examples.length, 0)
  const elements = families.reduce((total, family) => total + family.elements.length, 0)

  return (
    <helix-flex direction="column" gap="2xl">
      <helix-flex class="hero" direction="column" gap="lg">
        <helix-text as="h1">Helix</helix-text>
        <helix-text as="p" class="lede" tone="muted">
          The design system Fusion products are built on. Web components, so the framework stays
          swappable, and a token layer that themes them.
        </helix-text>
        <helix-flex gap="sm" wrap>
          <helix-button appearance="primary" href="/sandbox" size="lg">
            Open the sandbox
          </helix-button>
          <helix-button href="/components/button" size="lg">
            Read the API
          </helix-button>
        </helix-flex>
      </helix-flex>

      <helix-divider></helix-divider>

      <helix-flex gap="2xl" wrap>
        {[
          { label: 'families', value: families.length },
          { label: 'elements', value: elements },
          { label: 'examples', value: examples },
        ].map((stat) => (
          <helix-flex direction="column" key={stat.label}>
            <helix-text as="h3" appearance="heading">
              {stat.value}
            </helix-text>
            <helix-text appearance="caption" tone="subtle">
              {stat.label}
            </helix-text>
          </helix-flex>
        ))}
      </helix-flex>

      <helix-flex direction="column" gap="lg">
        <helix-text as="h2">Components</helix-text>
        <helix-grid gap="md" min="17rem">
          {families.map((family) => (
            <helix-card appearance="outlined" aria-label={family.label} key={family.slug}>
              <helix-flex align="center" gap="sm" justify="between" slot="header">
                <helix-text as="h3" appearance="title">
                  {family.label}
                </helix-text>
                {family.status && (
                  <helix-tag
                    appearance={family.status === 'stable' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {family.status}
                  </helix-tag>
                )}
              </helix-flex>
              <helix-text appearance="caption" tone="muted">
                {family.summary}
              </helix-text>
              <helix-flex gap="2xs" slot="footer">
                {family.examples.length > 0 && (
                  <helix-button
                    appearance="subtle"
                    href={`/sandbox?family=${family.slug}&example=${family.examples[0]?.slug}`}
                    size="sm"
                  >
                    Sandbox
                  </helix-button>
                )}
                <helix-button appearance="subtle" href={`/components/${family.slug}`} size="sm">
                  API
                </helix-button>
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </helix-flex>
    </helix-flex>
  )
}
