import Link from 'next/link'
import { families } from '../lib/catalog'

export default function Home() {
  const examples = families.reduce((total, family) => total + family.examples.length, 0)

  return (
    <div className="page">
      <header className="pageHead">
        <h1>Helix</h1>
        <p className="lede">
          {families.length} component families, {examples} examples. Every page here is read from
          the custom elements manifest and from example files that sit beside the components, so
          nothing on this site is written down twice.
        </p>
      </header>

      <div className="cardGrid">
        {families.map((family) => (
          <helix-card appearance="outlined" aria-labelledby={family.slug} key={family.slug}>
            <div className="cardHead" slot="header">
              <h2 id={family.slug}>{family.label}</h2>
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
            <helix-button appearance="subtle" size="sm" slot="footer">
              <Link href={`/components/${family.slug}`}>API</Link>
            </helix-button>
          </helix-card>
        ))}
      </div>
    </div>
  )
}
