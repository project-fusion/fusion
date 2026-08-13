import { families } from '../../lib/catalog'

export default function Home() {
  const examples = families.reduce((total, family) => total + family.examples.length, 0)
  const elements = families.reduce((total, family) => total + family.elements.length, 0)

  return (
    <div className="page">
      <section className="hero">
        <h1>Helix</h1>
        <p className="lede">
          The design system Fusion products are built on. Web components, so the framework stays
          swappable, and a token layer that themes them.
        </p>
        <div className="heroActions">
          <helix-button appearance="primary" href="/sandbox" size="lg">
            Open the sandbox
          </helix-button>
          <helix-button href="/components/button" size="lg">
            Read the API
          </helix-button>
        </div>
      </section>

      <helix-divider></helix-divider>

      <section className="stats">
        <div>
          <strong>{families.length}</strong>
          <span>families</span>
        </div>
        <div>
          <strong>{elements}</strong>
          <span>elements</span>
        </div>
        <div>
          <strong>{examples}</strong>
          <span>examples</span>
        </div>
      </section>

      <section aria-labelledby="components">
        <h2 id="components">Components</h2>
        <div className="cardGrid">
          {families.map((family) => (
            <helix-card appearance="outlined" aria-labelledby={family.slug} key={family.slug}>
              <div className="cardHead" slot="header">
                <h3 id={family.slug}>{family.label}</h3>
                {family.status && (
                  <helix-tag
                    appearance={family.status === 'stable' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {family.status}
                  </helix-tag>
                )}
              </div>
              {family.summary}
              <helix-button
                appearance="subtle"
                href={`/components/${family.slug}`}
                size="sm"
                slot="footer"
              >
                API
              </helix-button>
            </helix-card>
          ))}
        </div>
      </section>
    </div>
  )
}
