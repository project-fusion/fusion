/* Server only, which is what makes this free. The highlighter is a Lezer parse
   and a tree walk, so it runs during the build and the page ships colored
   markup with no client JavaScript spent on it. `helix/styled` never sees it. */

import { startCase } from '@fusion.dev/helix-cem'
import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CodeText, plainText } from '@/components/code-text/code-text'
import { docsShell } from '@/components/docs-shell/docs-shell'
import { SectionHeading } from '@/components/section-heading/section-heading'
import { findNative } from '@/content/native/native'
import { pageMetadata } from '@/utils/metadata/metadata'
import {
  type Element,
  type Example,
  findFamily,
  getFamilies,
} from '../../../../../../content/catalog/catalog'
import { sourceUrl } from '../../../../../../utils/source/source'
import { DESCRIPTION, first, MemberTable, NAME, PropertyTable, stacked } from './api-table'
import { DocumentActions } from './document-actions'
import { ExampleSummary, NativeReference, NativeUsage, railLinks, WebOnly } from './native-api'
import { NativeRail } from './native-rail'
import api from './page.module.css'
import { ComponentPreview, type PreviewLayout } from './preview'
import { TierAddress } from './tier-address'

/**
 * One component family, in full.
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
 * Examples alphabetically, with the headline held at the top.
 */
const byExample = (rows: Example[]): Example[] =>
  [...rows].sort((a, b) =>
    a.slug === 'default' || b.slug === 'default'
      ? Number(b.slug === 'default') - Number(a.slug === 'default')
      : a.label.localeCompare(b.label),
  )

/**
 * One element's whole surface, six tables deep.
 *
 * **Its own status where it differs from its family's.** The header states the
 * family's status, read from its root, and an add-on's element can join a
 * family at another one: `helix-sandbox-editor` is experimental in the stable
 * Sandbox family, and the page called it nothing but stable. The tag is the
 * one the header uses, so the two read as the same fact.
 */
function ElementApi({
  element,
  familyStatus,
  platform,
}: {
  element: Element
  familyStatus: string
  platform: 'web' | undefined
}) {
  return (
    <helix-flex
      data-platform={platform}
      data-tier={element.tier}
      direction="column"
      gap="md"
      id={element.tagName}
    >
      {/*
       *  The part, not the family and the part: the page has already said the
       *           family name twice above.
       */}
      <helix-flex align-items="center" data-density="sm" gap="sm" wrap>
        <SectionHeading as="h3" label={element.part || element.label} target={element.tagName}>
          {element.part || element.label}
        </SectionHeading>
        <helix-tag>
          <helix-text scale="code">{element.tagName}</helix-text>
        </helix-tag>
        {element.status && element.status !== familyStatus && (
          <helix-tag>{startCase(element.status)}</helix-tag>
        )}
      </helix-flex>

      {element.summary && (
        <helix-text as="p" class={api.description} emphasis="muted" scale="caption">
          <CodeText>{element.summary}</CodeText>
        </helix-text>
      )}

      {/* Split, because the two answer different questions and a table that
          mixes them answers neither. A reader opens Props to find out what they
          may set on the tag; `AvatarGroup.avatars` sat there beside a slot for
          avatars looking exactly like a second way to pass the same thing, and
          assigning to it throws. Reads have no default and never will, so they
          also do not want the column. */}
      <PropertyTable rows={element.properties.filter((row) => !row.readonly)} />
      <MemberTable
        hint="Read-only. These report something the element worked out, and assigning to one throws, which is why they have no default."
        label="Read"
        rows={element.properties
          .filter((row) => row.readonly)
          .map((row) => ({
            description: row.description,
            name: row.name,
            references: row.references,
            type: row.type,
          }))}
      />
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
      <MemberTable label="Custom state" rows={element.cssStates} typed={false} />
    </helix-flex>
  )
}

/**
 * The one tier a set of examples all belong to, or nothing where they differ.
 *
 * Returned as `undefined` rather than a string when a family has both, because
 * `data-tier` then has to be absent: an attribute naming one tier on a section
 * holding both would hide it in the mode where half of it applies.
 */
function onlyTier(examples: readonly Example[]): 'headless' | 'styled' | undefined {
  const tiers = new Set(examples.map((example) => example.tier))
  return tiers.size === 1 ? [...tiers][0] : undefined
}

/**
 * A title and a card for each of the eighty-eight families.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ family: string }>
}): Promise<Metadata> {
  const family = findFamily((await params).family)
  if (!family) {
    return {}
  }
  return pageMetadata({
    description: plainText(family.summary),
    /* Stands aside for `opengraph-image.tsx` beside this file. `pageMetadata`
       otherwise sets `images` to the site card, and a set `images` is what stops
       Next reading the convention at all, silently. */
    image: false,
    path: `/helix/components/${family.slug}`,
    title: family.label,
  })
}

export default async function FamilyDocs({
  params,
  searchParams,
}: {
  params: Promise<{ family: string }>
  searchParams: Promise<{ tier?: string }>
}) {
  const family = findFamily((await params).family)
  /* **The address may say which tier this page is about, and the server can
     act on it, which is what the preference never could.**
     The tier is a reader's own setting in `localStorage`, so the server has
     never seen it and the attribute is applied in an effect: a reader who
     prefers base gets a frame of styled before it switches. A query parameter
     is in the request, so the attribute can be in the HTML, and this is the
     first tier state on the site that does not flash.

     It forces the page and never writes storage. Following somebody's link must
     not re-set your own drawer, which is why `preferences.tsx` skips its stored
     value when the address said something. Validated against the two literals
     before it reaches a script tag. */
  const asked = (await searchParams).tier
  const forced = asked === 'headless' || asked === 'styled' ? asked : undefined
  if (!family) {
    notFound()
  }

  const _root = family.elements.find((entry) => entry.tagName === `helix-${family.slug}`)
  /* The one-liner, not the reasoning. `@description` is an essay: it argues
     with itself, cites measurements and names components that are not this one,
     which is right in a source file and wrong as the first thing under a
     heading. `@summary` is the sentence that says what the component is. */
  const prose = family.summary
  const headline = family.examples[0]
  /* One headline per tier, because the preference switches the whole page and
     this was the half that did not move: a reader choosing Base got the headless
     tables over the styled example, which is the one pairing that teaches
     something untrue. `catalog()` orders styled first, so `find` takes each
     tier's canonical example. */
  const headlines = (['styled', 'headless'] as const).flatMap((tier) => {
    const example = family.examples.find((one) => one.tier === tier)
    return example ? [{ example, tier }] : []
  })
  const source = sourceUrl(family.source)
  /* The catalog writes the block, so this page, the family's `.md`, and its
     `.json` import the same lines. */
  const imports = (tier: 'headless' | 'styled'): string => family.usage[tier].join('\n')
  /* **What the native preference replaces, marked `web`, and only where Helix
     draws the family natively.** Every other family's page carries no mark, so
     it renders as it did, and under native it keeps its web reference below
     the line `WebOnly` writes. */
  const native = findNative(family.slug)
  const web = native ? 'web' : undefined

  return (
    /* The shell and the rail are the layout's, so the nav survives a navigation
       between families and keeps the state a reader set on it. */
    <>
      <TierAddress />
      {forced && (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: one of two literals this file chose
          dangerouslySetInnerHTML={{
            __html:
              forced === 'headless'
                ? "document.documentElement.dataset.apiTier='headless'"
                : 'delete document.documentElement.dataset.apiTier',
          }}
        />
      )}
      <article className={docsShell.docsMain}>
        {/* `3xl`, the top of the scale, because a section break should be the
            largest space on the page: at `2xl` Usage sits as far from Preview as
            Root sits from Group, so the page has one rhythm and no hierarchy.
            Said on the element rather than in `site.css`, which overrides this
            very attribute from the document and wins silently. */}
        <helix-flex direction="column" gap="3xl">
          <helix-flex direction="column" gap="md">
            {/* Title and its actions on one line. The ellipsis holds everything
                that is about the *document* rather than about the component, so
                the one button worth a word of its own keeps it. */}
            <helix-flex
              align-items="center"
              class={api.docsTitle}
              gap="md"
              justify-content="between"
            >
              <helix-text as="h1">{family.label}</helix-text>
              <helix-flex align-items="center" data-density="sm" gap="xs">
                {/* An anchor, because it leaves the site. The URL is composed
                    here rather than stored: the manifest holds the path and the
                    ref is this site's to choose, which is what lets a versioned
                    reference point at the source it documents instead of at
                    whatever `main` holds when it is read. */}
                <a data-button="" href={source} rel="noreferrer" target="_blank">
                  View Source
                </a>
                <DocumentActions family={family.slug} headline={headline?.slug} />
              </helix-flex>
            </helix-flex>

            <helix-text as="p" class={api.description} emphasis="muted" scale="caption">
              <CodeText>{first(prose)}</CodeText>
            </helix-text>

            {/* Three facts about the component, in the same register: a tag
                each, so none of the three reads as a different kind of thing
                from the other two. */}
            <helix-flex align-items="center" data-density="sm" gap="xs" wrap>
              {family.status && (
                <helix-tag data-platform={web}>{startCase(family.status)}</helix-tag>
              )}
              {native && <helix-tag data-platform="native">{startCase(native.status)}</helix-tag>}
              {family.since && <helix-tag data-platform={web}>Since {family.since}</helix-tag>}
              {family.category && <helix-tag>{startCase(family.category)}</helix-tag>}
            </helix-flex>
            {!native && <WebOnly label={family.label} />}
          </helix-flex>

          <helix-flex direction="column" gap="md" id="usage">
            <SectionHeading as="h2" label="Usage" target="usage">
              Usage
            </SectionHeading>
            {/* The import, and only the import: a block holding the tag the
                heading two lines above already says teaches nothing and is
                still a line a reader has to read. And deliberately no CDN
                script tag, since nothing here has been released yet: a
                `<script src>` would be the one instruction on this page that
                cannot be followed. */}
            {family.elements.some((entry) => entry.tier === 'styled') && (
              <helix-code-block data-platform={web} data-tier="styled">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(imports('styled'), 'js'),
                  }}
                />
              </helix-code-block>
            )}
            {family.elements.some((entry) => entry.tier === 'headless') && (
              <helix-code-block data-platform={web} data-tier="headless">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(imports('headless'), 'js'),
                  }}
                />
              </helix-code-block>
            )}
            {native && <NativeUsage native={native} />}
          </helix-flex>

          {/* The web elements drawn in the browser, which the native preference
              hides: nothing drawn here stands for how a phone draws them. */}
          <helix-flex data-platform={web} direction="column" gap="md" id="preview">
            <SectionHeading as="h2" label="Preview" target="preview">
              Preview
            </SectionHeading>
            {/* The family's headline example, which is `preview.html` and is
                first in the list by construction. A family with no examples
                shows nothing rather than an empty frame. */}
            {headlines.length > 0 ? (
              headlines.map(({ example, tier }) => (
                <div data-tier={tier} key={tier}>
                  <ComponentPreview
                    css={example.css}
                    html={example.html}
                    {...(example.layout ? { layout: example.layout as PreviewLayout } : {})}
                    {...(example.min ? { min: example.min } : {})}
                    /* **The tier travels with the link.** A reader on the base
                       reference who opens the sandbox was looking at the headless
                       API and arrived at the styled example, because the sandbox
                       reads its own tier from a preference this page had already
                       overridden. Carried only when it was forced, so an ordinary
                       link stays `?e=family.slug`. */
                    sandboxHref={`/helix/sandbox?e=${family.slug}.${example.slug}${
                      forced ? `&tier=${forced}` : ''
                    }`}
                  />
                </div>
              ))
            ) : (
              <helix-empty>
                <helix-text emphasis="muted" scale="caption">
                  No example yet.
                </helix-text>
              </helix-empty>
            )}
          </helix-flex>

          {/* Wide between one element and the next, tight inside each, or there
              is no seam between one element's API and another's. `2xl` because
              that is the top of `Flex`'s scale: the token `space-3xl` exists but
              the component does not offer it, which is the component being right
              about how far apart two things in one flow should ever be. */}
          <helix-flex direction="column" gap="2xl" id="api">
            <SectionHeading as="h2" label="API Reference" target="api">
              API Reference
            </SectionHeading>
            {family.elements.map((element) => (
              <ElementApi
                element={element}
                familyStatus={family.status}
                key={element.tagName}
                platform={web}
              />
            ))}
            {native && <NativeReference elements={family.elements} native={native} />}
          </helix-flex>

          {family.examples.length > 0 && (
            /* The whole section carries a tier where every example in it is one
               tier, which is 85 of the 88 families: selecting Base would
               otherwise leave the heading standing over a table with every row
               hidden, and an empty table reads as data that failed to load
               rather than as a tier with nothing in it yet. Where a family has
               both, the section stays and the rows filter themselves. */
            <helix-flex
              data-tier={onlyTier(family.examples)}
              direction="column"
              gap="md"
              id="examples"
            >
              <SectionHeading as="h2" label="Examples" target="examples">
                Examples
              </SectionHeading>
              <div className={api.apiTable} style={stacked(false)}>
                <helix-table label="Examples">
                  <helix-table-column width={NAME}>Name</helix-table-column>
                  <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
                  {/* Rows are keyed on the tier as well as the slug. Both tiers
                    name their canonical example `preview.html`, so the slug
                    alone hands React two children called `preview`. */}
                  {byExample(family.examples).map((example) => (
                    <helix-table-row
                      data-tier={example.tier}
                      key={`${example.tier}.${example.slug}`}
                    >
                      <helix-table-cell header>
                        {/* `quiet`: a column where every row is a link does not
                          need every row underlined and blue. The variant carries
                          the muted color, drops the rule, and moves to full
                          foreground on hover. */}
                        <Link
                          data-link="quiet"
                          href={`/helix/sandbox?e=${family.slug}.${example.slug}${
                            forced ? `&tier=${forced}` : ''
                          }`}
                        >
                          {example.label}
                        </Link>
                      </helix-table-cell>
                      {/* A dash where nobody has written one yet. An empty cell
                        reads as data that failed to load; a dash reads as a
                        blank someone still has to fill. */}
                      <helix-table-cell>
                        <helix-text emphasis="muted" variant="caption">
                          <ExampleSummary example={example} native={native !== undefined} />
                        </helix-text>
                      </helix-table-cell>
                    </helix-table-row>
                  ))}
                </helix-table>
              </div>
            </helix-flex>
          )}
        </helix-flex>
      </article>

      <aside className={docsShell.docsRail}>
        {/*
         *  `Outline` rather than a hand-rolled list: it computes what is current
         *             from where the headings actually are and writes `aria-current` onto
         *             these anchors, so the rail says where you are and not only where you
         *             could go.
         */}
        <helix-text class={docsShell.docsRailTitle} emphasis="muted" scale="label">
          On this page
        </helix-text>
        <helix-outline label="On this page">
          {SECTIONS.map((section) => (
            <a
              data-platform={section.id === 'preview' ? web : undefined}
              href={`#${section.id}`}
              key={section.id}
              suppressHydrationWarning
            >
              {section.label}
            </a>
          ))}
          {family.elements.map((element) => (
            <a
              data-level="2"
              data-platform={web}
              data-tier={element.tier}
              href={`#${element.tagName}`}
              key={element.tagName}
              suppressHydrationWarning
            >
              {element.part || element.label}
            </a>
          ))}
          {native && <NativeRail links={railLinks(native, family.elements)} />}
          {family.examples.length > 0 && (
            <a data-tier={onlyTier(family.examples)} href="#examples" suppressHydrationWarning>
              Examples
            </a>
          )}
        </helix-outline>
      </aside>
    </>
  )
}
