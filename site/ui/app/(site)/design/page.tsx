import Link from 'next/link'
import { getFamilies } from '../../../lib/catalog'
import { ComponentArt } from '../../../lib/component-art'
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
            <Link
              aria-label={family.label}
              className="familyCard"
              data-card
              href={`/design/components/${family.slug}`}
              key={family.slug}
            >
              <helix-card appearance="outlined">
                <ComponentArt slug={family.slug} />
                <helix-flex align="center" gap="sm" justify="between" slot="header">
                  <helix-text as="h3" appearance="title">
                    {family.label}
                  </helix-text>
                  {/* A mark rather than a word. Every component in this list is
                      experimental, so a tag on each of them is a column of
                      identical yellow labels that says nothing by being
                      everywhere, and it competes with the name it sits beside.
                      The icon carries its own accessible name, so a reader who
                      cannot see it is told the same thing a pointer user gets
                      from the tooltip. Same mark and same words as the
                      sandbox's own tree. */}
                  {family.status === 'experimental' && (
                    <helix-tooltip content="Experimental. The API can change." placement="top">
                      <helix-tag className="statusMark" tone="warning">
                        <helix-icon label="Experimental" name="flask"></helix-icon>
                      </helix-tag>
                    </helix-tooltip>
                  )}
                </helix-flex>
                <helix-text appearance="caption" tone="muted">
                  {family.summary}
                </helix-text>
              </helix-card>
            </Link>
          ))}
        </helix-grid>
      </helix-flex>
    </VerticalPage>
  )
}
