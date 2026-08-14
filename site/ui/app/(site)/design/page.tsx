import Link from 'next/link'
import { getFamilies } from '../../../lib/catalog'
import { findVertical } from '../../verticals'
import { VerticalPage } from '../vertical-page'

const vertical = findVertical('/design')

export const metadata = { title: vertical?.name }

/**
 * Fusion Design.
 *
 * The one vertical with something to open, so it lists what Helix ships and
 * points at both surfaces: the API for what a component can do, the sandbox for
 * what it looks like.
 */
export default function Page() {
  if (!vertical) {
    return null
  }

  const families = getFamilies()
  const elements = families.reduce((total, family) => total + family.elements.length, 0)
  const examples = families.reduce((total, family) => total + family.examples.length, 0)

  return (
    <VerticalPage vertical={vertical}>
      <helix-flex gap="sm" wrap>
        <Link data-button="primary" href="/design/sandbox">
          Open the sandbox
        </Link>
        <Link data-button href="/design/components/button">
          Read the API
        </Link>
      </helix-flex>

      <helix-flex gap="2xl" wrap>
        {[
          { label: 'families', value: families.length },
          { label: 'elements', value: elements },
          { label: 'examples', value: examples },
        ].map((stat) => (
          <helix-flex direction="column" key={stat.label}>
            <helix-text as="h2" appearance="heading">
              {stat.value}
            </helix-text>
            <helix-text appearance="caption" tone="subtle">
              {stat.label}
            </helix-text>
          </helix-flex>
        ))}
      </helix-flex>

      <helix-flex direction="column" gap="lg">
        <helix-text as="h2" appearance="subheading">
          Components
        </helix-text>
        <helix-grid gap="md" min="17rem">
          {families.map((family) => (
            <helix-card appearance="outlined" aria-label={family.label} key={family.slug}>
              <helix-flex align="center" gap="sm" justify="between" slot="header">
                <helix-text as="h3" appearance="title">
                  {family.label}
                </helix-text>
                {family.status && (
                  <helix-tag appearance={family.status === 'stable' ? 'success' : 'warning'}>
                    {family.status}
                  </helix-tag>
                )}
              </helix-flex>
              <helix-text appearance="caption" tone="muted">
                {family.summary}
              </helix-text>
              <helix-flex data-density="sm" gap="2xs" slot="footer">
                {family.examples.length > 0 && (
                  <Link
                    data-button="subtle"
                    href={`/design/sandbox?family=${family.slug}&example=${family.examples[0]?.slug}`}
                  >
                    Sandbox
                  </Link>
                )}
                <Link data-button="subtle" href={`/design/components/${family.slug}`}>
                  API
                </Link>
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </helix-flex>
    </VerticalPage>
  )
}
