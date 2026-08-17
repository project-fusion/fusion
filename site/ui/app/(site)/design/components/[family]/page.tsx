import Link from 'next/link'
import { notFound } from 'next/navigation'
import { startCase } from '@/lib/naming'
import { type ApiMember, findFamily, getFamilies } from '../../../../../lib/catalog'

/**
 * API reference for one family, read from the manifest and nothing else.
 *
 * Holds no examples on purpose. This page answers what a component can do; the
 * sandbox answers what it looks like. A reference that starts collecting
 * pictures stops being the place you can trust to be complete.
 *
 * Tables are `helix-table`, a grid rather than a `<table>`: every column lines
 * up across rows while each row stays a real element. The roles are declared,
 * because a grid of divs is not a table to anything reading it.
 */

export function generateStaticParams() {
  return getFamilies().map((family) => ({ family: family.slug }))
}

function ApiTable({ caption, rows }: { caption: string; rows: ApiMember[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <helix-flex direction="column" gap="sm">
      <helix-text appearance="label" tone="subtle">
        {caption}
      </helix-text>
      <helix-table columns="minmax(10rem, 18rem) minmax(0, 1fr)" label={caption}>
        {rows.map((row) => (
          <helix-table-row key={row.name}>
            <helix-table-cell>
              <helix-text appearance="code" tone="primary">
                {row.name || '(default)'}
              </helix-text>
              {row.type && (
                <helix-text as="p" appearance="code" tone="subtle">
                  {row.type}
                </helix-text>
              )}
            </helix-table-cell>
            <helix-table-cell>
              <helix-text appearance="caption" tone="muted">
                {row.description.split('\n\n')[0]}
              </helix-text>
            </helix-table-cell>
          </helix-table-row>
        ))}
      </helix-table>
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
      <helix-tree active={family.slug} class="docsNav" label="Components">
        {getFamilies().map((entry) => (
          <helix-tree-item key={entry.slug} value={entry.slug}>
            <a data-link="quiet" href={`/design/components/${entry.slug}`}>
              {entry.label}
            </a>
          </helix-tree-item>
        ))}
      </helix-tree>

      <helix-flex class="docsMain" direction="column" gap="xl">
        <helix-flex direction="column" gap="sm">
          <helix-text as="h1" appearance="heading">
            {family.label}
          </helix-text>
          <helix-flex align="center" data-density="sm" gap="xs" wrap>
            {/* Neutral at every stage. The word is the information, and a
                colour behind it was saying the same thing a second time in a
                register the word does not have: `warning` read as something
                being wrong rather than as a stage the component is at. */}
            {family.status && <helix-tag>{startCase(family.status)}</helix-tag>}
            {family.since && (
              <helix-text appearance="label" tone="subtle">
                since {family.since}
              </helix-text>
            )}
            {family.aliases.length > 0 && (
              <helix-text appearance="label" tone="subtle">
                Also known as {family.aliases.join(', ')}
              </helix-text>
            )}
          </helix-flex>
          <helix-text as="p" tone="muted">
            {family.summary}
          </helix-text>
          {family.examples.length > 0 && (
            <helix-flex data-density="sm">
              <Link
                data-button="tertiary"
                href={`/design/sandbox?e=${family.slug}.${family.examples[0]?.slug}`}
              >
                Open in the sandbox
              </Link>
            </helix-flex>
          )}
        </helix-flex>

        {family.elements.map((element) => (
          <helix-flex
            class="element"
            direction="column"
            gap="lg"
            id={element.tagName}
            key={element.tagName}
          >
            <helix-flex direction="column" gap="2xs">
              <helix-flex align="center" data-density="sm" gap="sm">
                <helix-text as="h2" appearance="subheading">
                  {element.label}
                </helix-text>
                <helix-tag>{element.tier}</helix-tag>
              </helix-flex>
              <helix-text appearance="code" tone="subtle">
                &lt;{element.tagName}&gt;
              </helix-text>
            </helix-flex>

            {element.description && (
              <helix-text as="p" class="description" appearance="caption" tone="muted">
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

      {/* On this page. A plain list of the elements documented below, which is
          what a table of contents for a reference page is. When the Table of
          Contents component lands it drops into this rail unchanged. */}
      <helix-flex class="docsRail" direction="column" gap="2xs">
        <helix-text appearance="label" class="docsRailTitle" tone="subtle">
          On this page
        </helix-text>
        <helix-flex class="docsRailList" direction="column">
          {family.elements.map((element) => (
            <a
              className="docsRailLink"
              data-link="quiet"
              data-link-size="sm"
              href={`#${element.tagName}`}
              key={element.tagName}
            >
              {element.label} · {element.tier}
            </a>
          ))}
        </helix-flex>
      </helix-flex>
    </div>
  )
}
