import Link from 'next/link'
import { notFound } from 'next/navigation'
import { startCase } from '@/lib/naming'
import {
  type ApiMember,
  type Element,
  findFamily,
  getFamilies,
  type PropertyDoc,
} from '../../../../../lib/catalog'
import { ComponentPreview } from './preview'

/**
 * One component family, in full.
 *
 * *Changed 19 Aug 2026.* This page used to be the API and nothing else, on the
 * grounds that a reference which starts collecting pictures stops being the
 * place you can trust to be complete. What that split actually produced was two
 * pages a reader had to hold in their head at once: the tables here, the
 * pictures somewhere else, and no page that answered "what is this and how do I
 * use it" without a navigation in the middle of the answer. The sandbox is
 * still where an example is *edited*; this is where it is *seen*, alongside the
 * API it demonstrates.
 *
 * Every section carries an `id`, because the rail is a real `Outline` now
 * rather than a hand-rolled list, and it reads the anchors the page gives it.
 *
 * Tables are `helix-table`, a grid rather than a `<table>`: every column lines
 * up across rows while each row stays a real element. The heading cell is what
 * names the data, which is why none of these tables carries a caption above it.
 * "Prop" over the first column says the same thing a "Properties" heading would
 * and says it inside the table, where a reader scanning columns already is.
 */

export function generateStaticParams() {
  return getFamilies().map((family) => ({ family: family.slug }))
}

/** The sections every family has, in the order the page renders them. */
const SECTIONS = [
  { id: 'usage', label: 'Usage' },
  { id: 'preview', label: 'Preview' },
  { id: 'api', label: 'API Reference' },
] as const

/**
 * A first column sized to its content, and a description that takes the rest.
 *
 * Named rather than repeated per table so the six tables in a section line up
 * with each other. A reader comparing a slot to a part is comparing two tables,
 * and columns that disagree by a few rem read as two unrelated shapes.
 */
const NARROW = '14rem'

const first = (text: string): string => text.split('\n\n')[0] ?? ''

function Code({ children }: { children: string }) {
  return (
    <helix-text appearance="code" tone="primary">
      {children}
    </helix-text>
  )
}

/** Name, type, description. Slots and parts pass no type and get two columns. */
function MemberTable({
  label,
  rows,
  typed = true,
}: {
  label: string
  rows: ApiMember[]
  typed?: boolean
}) {
  if (rows.length === 0) {
    return null
  }
  return (
    <helix-table label={label}>
      <helix-table-column width={NARROW}>{label}</helix-table-column>
      {typed && <helix-table-column width="16rem">Type</helix-table-column>}
      <helix-table-column>Description</helix-table-column>
      {rows.map((row) => (
        <helix-table-row key={row.name}>
          <helix-table-cell header>
            <Code>{row.name || '(default)'}</Code>
          </helix-table-cell>
          {typed && (
            <helix-table-cell>
              {row.type && (
                <helix-text appearance="code" tone="subtle">
                  {row.type}
                </helix-text>
              )}
            </helix-table-cell>
          )}
          <helix-table-cell>
            <helix-text appearance="caption" tone="muted">
              {first(row.description)}
            </helix-text>
          </helix-table-cell>
        </helix-table-row>
      ))}
    </helix-table>
  )
}

/** The one table with a fourth column, because a property has a resting value. */
function PropertyTable({ rows }: { rows: PropertyDoc[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <helix-table label="Properties">
      <helix-table-column width={NARROW}>Prop</helix-table-column>
      <helix-table-column width="14rem">Type</helix-table-column>
      <helix-table-column width="8rem">Default</helix-table-column>
      <helix-table-column>Description</helix-table-column>
      {rows.map((row) => (
        <helix-table-row key={row.name}>
          <helix-table-cell header>
            <Code>{row.name}</Code>
          </helix-table-cell>
          <helix-table-cell>
            <helix-text appearance="code" tone="subtle">
              {row.type}
            </helix-text>
          </helix-table-cell>
          <helix-table-cell>
            {row.default && (
              <helix-text appearance="code" tone="subtle">
                {row.default}
              </helix-text>
            )}
          </helix-table-cell>
          <helix-table-cell>
            <helix-text appearance="caption" tone="muted">
              {first(row.description)}
            </helix-text>
          </helix-table-cell>
        </helix-table-row>
      ))}
    </helix-table>
  )
}

/** One element's whole surface, six tables deep. */
function ElementApi({ element }: { element: Element }) {
  return (
    <helix-flex data-tier={element.tier} direction="column" gap="lg" id={element.tagName}>
      <helix-flex direction="column" gap="2xs">
        <helix-text appearance="subheading" as="h3">
          {element.label}
        </helix-text>
        <helix-text appearance="code" tone="subtle">
          &lt;{element.tagName}&gt;
        </helix-text>
      </helix-flex>

      {element.description && (
        <helix-text appearance="caption" as="p" class="description" tone="muted">
          {first(element.description)}
        </helix-text>
      )}

      <PropertyTable rows={element.properties} />
      <MemberTable label="Slot" rows={element.slots} typed={false} />
      <MemberTable
        label="Event"
        rows={element.events.map((event) => ({
          description: event.description,
          name: event.name,
          type: event.type,
        }))}
      />
      <MemberTable label="Method" rows={element.methods} />
      <MemberTable label="Part" rows={element.cssParts} typed={false} />
      <MemberTable label="CSS Property" rows={element.cssProperties} typed={false} />
    </helix-flex>
  )
}

export default async function FamilyDocs({ params }: { params: Promise<{ family: string }> }) {
  const family = findFamily((await params).family)
  if (!family) {
    notFound()
  }

  const families = getFamilies()
  const root = family.elements.find((entry) => entry.tagName === `helix-${family.slug}`)
  /* The long prose, not the one-liner. `@summary` is what the card in the
     gallery shows and it is a sentence; `@description` is the reasoning, and a
     reference page is where that belongs. */
  const prose = root?.description || family.summary
  const described = family.examples.some((example) => example.description !== '')
  const headline = family.examples[0]

  return (
    <div className="docsShell">
      <nav aria-label="Documentation" className="docsNav">
        {/* A branch, not a flat list. Components is one entry among the guides
            that will sit beside it rather than the whole of the navigation,
            which is what a flat tree of sixty-six families quietly asserted. */}
        <helix-tree active={family.slug} label="Documentation">
          {/* `default-open`, not `open`. `open` is the controlled half of
              `MixinControllerOpen`, and setting it declares the consumer owns
              the state: the branch would freeze open and a reader could not
              collapse it. Seeding is what markup is for. */}
          <helix-tree-item default-open suppressHydrationWarning value="components">
            Components
            {families.map((entry) => (
              <helix-tree-item key={entry.slug} slot="children" value={entry.slug}>
                <Link data-link="quiet" href={`/design/components/${entry.slug}`}>
                  {entry.label}
                </Link>
              </helix-tree-item>
            ))}
          </helix-tree-item>
        </helix-tree>
      </nav>

      <article className="docsMain">
        <helix-flex direction="column" gap="2xl">
          <helix-flex direction="column" gap="md">
            {/* Title and its actions on one line. The ellipsis holds everything
                that is about the *document* rather than about the component, so
                the one button worth a word of its own keeps it. */}
            <helix-flex align="center" class="docsTitle" gap="md" justify="between">
              <helix-text appearance="heading" as="h1">
                {family.label}
              </helix-text>
              <helix-flex align="center" data-density="sm" gap="xs">
                {/* Unwired on purpose, pending a decision about where source is
                    read from: nothing is published and there is no public repo
                    URL to point at, and a button linking to a page that does not
                    exist is worse than one that visibly does nothing yet. */}
                <helix-button appearance="tertiary">View Source</helix-button>
                <helix-menu label="Document actions">
                  <helix-icon-button appearance="tertiary" label="More" slot="trigger">
                    <helix-icon name="dots-three"></helix-icon>
                  </helix-icon-button>
                  <helix-menu-item value="view-markdown">View Markdown</helix-menu-item>
                  <helix-menu-item value="copy-markdown">Copy Markdown</helix-menu-item>
                  <helix-menu-item value="open-cursor">Open in Cursor</helix-menu-item>
                  <helix-menu-item value="open-claude">Open in Claude</helix-menu-item>
                </helix-menu>
              </helix-flex>
            </helix-flex>

            <helix-text appearance="caption" as="p" class="description" tone="muted">
              {first(prose)}
            </helix-text>

            {/* Three facts about the component, in the same register. Status was
                already a tag and Since and Category were loose text beside it,
                so a reader had to notice that one of the three was a different
                kind of thing for no reason a reader could see. */}
            <helix-flex align="center" data-density="sm" gap="xs" wrap>
              {family.status && <helix-tag>{startCase(family.status)}</helix-tag>}
              {family.since && <helix-tag>Since {family.since}</helix-tag>}
              {family.category && <helix-tag>{startCase(family.category)}</helix-tag>}
              {family.aliases.length > 0 && (
                <helix-text appearance="label" tone="subtle">
                  Also known as {family.aliases.join(', ')}
                </helix-text>
              )}
            </helix-flex>
          </helix-flex>

          <helix-flex direction="column" gap="md" id="usage">
            <helix-text appearance="title" as="h2">
              Usage
            </helix-text>
            {/* The import and the markup, and deliberately no CDN script tag:
                every package here is `private: true` and nothing is published,
                so a `<script src>` line would be the one instruction on this
                page that cannot be followed. */}
            <helix-flex direction="column" gap="sm">
              {family.elements.some((entry) => entry.tier === 'styled') && (
                <pre className="docsCode" data-tier="styled">
                  <code>{`import '@helix-io/web/${family.slug}'`}</code>
                </pre>
              )}
              {family.elements.some((entry) => entry.tier === 'headless') && (
                <pre className="docsCode" data-tier="headless">
                  <code>{`import '@helix-io/headless/${family.slug}'`}</code>
                </pre>
              )}
              <pre className="docsCode">
                <code>{`<helix-${family.slug}></helix-${family.slug}>`}</code>
              </pre>
            </helix-flex>
          </helix-flex>

          <helix-flex direction="column" gap="md" id="preview">
            <helix-text appearance="title" as="h2">
              Preview
            </helix-text>
            {/* The family's headline example, which is `default.html` and is
                first in the list by construction. A family with no examples
                shows nothing rather than an empty frame. */}
            {headline ? (
              <ComponentPreview css={headline.css} html={headline.html} />
            ) : (
              <helix-empty>
                <helix-text appearance="caption" tone="muted">
                  No example yet.
                </helix-text>
              </helix-empty>
            )}
          </helix-flex>

          <helix-flex direction="column" gap="xl" id="api">
            <helix-text appearance="title" as="h2">
              API Reference
            </helix-text>
            {family.elements.map((element) => (
              <ElementApi element={element} key={element.tagName} />
            ))}
          </helix-flex>

          {family.examples.length > 0 && (
            <helix-flex direction="column" gap="md" id="examples">
              <helix-text appearance="title" as="h2">
                Examples
              </helix-text>
              <helix-table label="Examples">
                <helix-table-column width={NARROW}>Name</helix-table-column>
                {/* The column appears when there is something to put in it.
                    None of the 247 examples carries an `@summary` yet, and a
                    column of empty cells reads as data that failed to load
                    rather than as prose nobody has written. */}
                {described && <helix-table-column>Description</helix-table-column>}
                {family.examples.map((example) => (
                  <helix-table-row key={example.slug}>
                    <helix-table-cell header>
                      <Link href={`/design/sandbox?e=${family.slug}.${example.slug}`}>
                        {example.label}
                      </Link>
                    </helix-table-cell>
                    {described && (
                      <helix-table-cell>
                        <helix-text appearance="caption" tone="muted">
                          {example.description}
                        </helix-text>
                      </helix-table-cell>
                    )}
                  </helix-table-row>
                ))}
              </helix-table>
            </helix-flex>
          )}
        </helix-flex>
      </article>

      <aside className="docsRail">
        {/* The real component, which computes what is current from where the
            headings actually are and writes `aria-current` onto these anchors.
            The list it replaced marked nothing at all, so the rail said where
            you could go and never where you were. */}
        <helix-outline label="On this page">
          {SECTIONS.map((section) => (
            <a href={`#${section.id}`} key={section.id} suppressHydrationWarning>
              {section.label}
            </a>
          ))}
          {family.elements.map((element) => (
            <a
              data-level="2"
              data-tier={element.tier}
              href={`#${element.tagName}`}
              key={element.tagName}
              suppressHydrationWarning
            >
              {element.label}
            </a>
          ))}
          {family.examples.length > 0 && (
            <a href="#examples" suppressHydrationWarning>
              Examples
            </a>
          )}
        </helix-outline>
      </aside>
    </div>
  )
}
