import { notFound } from 'next/navigation'
import { type ApiMember, families, findFamily } from '../../../../lib/catalog'

/**
 * API reference for one family, read from the manifest and nothing else.
 *
 * Holds no examples on purpose. This page answers what a component can do; the
 * sandbox answers what it looks like. A reference that starts collecting
 * pictures stops being the place you can trust to be complete.
 *
 * The tables are still native `<table>`. A Table family is next; until it
 * exists, a real table beats a grid of divs pretending to be one.
 */

export function generateStaticParams() {
  return families.map((family) => ({ family: family.slug }))
}

function ApiTable({ caption, rows }: { caption: string; rows: ApiMember[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <helix-flex direction="column" gap="sm">
      <helix-text size="xs" tone="subtle" weight="semibold">
        {caption.toUpperCase()}
      </helix-text>
      <table className="apiTable">
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <helix-text mono size="xs" tone="primary">
                  {row.name || '(default)'}
                </helix-text>
                {row.type && (
                  <helix-text block mono size="xs" tone="subtle">
                    {row.type}
                  </helix-text>
                )}
              </td>
              <td>
                <helix-text size="sm" tone="muted">
                  {row.description.split('\n\n')[0]}
                </helix-text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </helix-flex>
  )
}

export default async function FamilyDocs({ params }: { params: Promise<{ family: string }> }) {
  const family = findFamily((await params).family)
  if (!family) {
    notFound()
  }

  return (
    <div className="docsShell">
      {/* Families only. Examples belong to the sandbox, and listing them here
          is what made the two surfaces one confusing thing. */}
      <helix-tree class="docsNav" label="Components" value={family.slug}>
        {families.map((entry) => (
          <helix-tree-item key={entry.slug} value={entry.slug}>
            <helix-link appearance="quiet" href={`/components/${entry.slug}`}>
              {entry.label}
            </helix-link>
          </helix-tree-item>
        ))}
      </helix-tree>

      <helix-flex direction="column" gap="xl">
        <helix-flex direction="column" gap="sm">
          <helix-heading level={1} size="2xl">
            {family.label}
          </helix-heading>
          <helix-flex align="center" gap="xs" wrap>
            {family.status && (
              <helix-tag appearance={family.status === 'stable' ? 'success' : 'warning'} size="sm">
                {family.status}
              </helix-tag>
            )}
            {family.since && (
              <helix-text size="xs" tone="subtle">
                since {family.since}
              </helix-text>
            )}
            {family.aliases.length > 0 && (
              <helix-text size="xs" tone="subtle">
                Also known as {family.aliases.join(', ')}
              </helix-text>
            )}
          </helix-flex>
          <helix-text block size="lg" tone="muted">
            {family.summary}
          </helix-text>
          {family.examples.length > 0 && (
            <helix-flex>
              <helix-button
                appearance="subtle"
                href={`/sandbox?family=${family.slug}&example=${family.examples[0]?.slug}`}
                size="sm"
              >
                Open in the sandbox
              </helix-button>
            </helix-flex>
          )}
        </helix-flex>

        {family.elements.map((element) => (
          <helix-flex class="element" direction="column" gap="lg" key={element.tagName}>
            <helix-flex direction="column" gap="2xs">
              <helix-flex align="center" gap="sm">
                <helix-heading level={2} size="xl">
                  {element.label}
                </helix-heading>
                <helix-tag size="sm">{element.tier}</helix-tag>
              </helix-flex>
              <helix-text mono size="sm" tone="subtle">
                &lt;{element.tagName}&gt;
              </helix-text>
            </helix-flex>

            {element.description && (
              <helix-text block class="description" size="sm" tone="muted">
                {element.description}
              </helix-text>
            )}

            <ApiTable caption="Attributes" rows={element.attributes} />
            <ApiTable caption="Slots" rows={element.slots} />
            <ApiTable caption="Parts" rows={element.cssParts} />
            <ApiTable caption="CSS properties" rows={element.cssProperties} />
            <ApiTable
              caption="Events"
              rows={element.events.map((event) => ({
                description: event.description,
                name: event.name,
                type: event.reactProp,
              }))}
            />
          </helix-flex>
        ))}
      </helix-flex>
    </div>
  )
}
