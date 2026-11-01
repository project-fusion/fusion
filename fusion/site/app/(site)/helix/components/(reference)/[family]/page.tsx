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
  type AnatomyPart,
  type Element,
  type Example,
  findFamily,
  getFamilies,
} from '../../../../../../content/catalog/catalog'
import { sourceUrl } from '../../../../../../utils/source/source'
import { AnatomyPreview } from './anatomy'
import { ANATOMY_ID, Anatomy, withAnatomy as elementsWithAnatomy } from './element-anatomy'
import { DESCRIPTION, first, MemberTable, NAME, PropertyTable, stacked } from './api-table'
import { DocumentActions } from './document-actions'
import { ExampleSummary, NativeReference, NativeUsage, railLinks, WebOnly } from './native-api'
import { NativeRail } from './native-rail'
import api from './page.module.css'
import { FamilyPicture } from './picture'
import { ComponentPreview, type PreviewLayout } from './preview'
import { TierAddress } from './tier-address'

/**
 * One component family, in full.
 */

export function generateStaticParams() {
  return getFamilies().map((family) => ({ family: family.slug }))
}

/**
 * The sections a family has, in the order the page renders them. Guidelines is
 * there only where the family writes guidance.
 */
const SECTIONS = [
  { id: 'import', label: 'Import' },
  { id: 'preview', label: 'Preview' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: ANATOMY_ID, label: 'Anatomy' },
  { id: 'api', label: 'API reference' },
] as const

/**
 * Words in a list as a sentence reads them: "Chip", "Chip and Pill", and
 * "Chip, Pill, and Label", with the serial comma.
 */
const listed = (words: readonly string[]): string =>
  words.length < 3
    ? words.join(' and ')
    : `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`

/**
 * A situation as it reads after a family's name and a colon: "Select: a value a
 * form submits." The guidance writes each one as a sentence, so its first
 * letter is lowered, unless the first word is a name such as "HTML". A row
 * that opens another family is named this way, the family first.
 */
const after = (text: string): string =>
  /^[A-Z](?![A-Z])/.test(text) ? text[0]?.toLowerCase() + text.slice(1) : text

/**
 * A family's headline example as the choosing table pictures it: at rest, with
 * the template that tells the frame to draw it small. A root that the example
 * opens is closed again, so a Dialog is pictured as the page shows it before
 * you press anything.
 */
const withPicture = (html: string, slug: string): string => {
  const resting = html.replace(
    new RegExp(`<(helix-(?:headless-)?${slug})(?=[\\s>])([^>]*)>`, 'g'),
    (_tag, name: string, attributes: string) =>
      `<${name}${attributes.replace(/\sopen(?:=(?:""|''|"open"|'open'))?(?=[\s>]|$)/, '')}>`,
  )
  return `${resting.trimEnd()}\n<template data-preview-picture></template>\n`
}

/** The example a family is pictured by: its styled headline, where it has one. */
const picturedBy = (slug: string): Example | undefined => {
  const examples = findFamily(slug)?.examples ?? []
  return examples.find((example) => example.tier === 'styled') ?? examples[0]
}

/**
 * How a reader reaches a part from their own code: the element's tag, the
 * `::part()` that styles it, or the `slot` its content is written into.
 */
const reached = (part: AnatomyPart): string =>
  part.kind === 'element'
    ? `<${part.tag}>`
    : part.kind === 'part'
      ? `::part(${part.name})`
      : `slot="${part.name}"`

/**
 * The headline example with the template the frame draws the markers from,
 * each part as `kind:tag:name`. A headless example names the headless tags.
 *
 * **Opened, where the root opens.** A Select, a Menu, or a Drawer draws its
 * surface only while it is open, and most of what it is made of is on that
 * surface. The first root in the example gets `open` where it does not
 * already have it, as Dialog's example already does for its own preview.
 */
const withAnatomy = (
  html: string,
  parts: readonly AnatomyPart[],
  root: string,
  opens: boolean,
): string => {
  const headless = root.startsWith('helix-headless-')
  const tokens = parts.map((part) => {
    const tag = headless ? part.tag.replace(/^helix-/, 'helix-headless-') : part.tag
    return `${part.kind}:${tag}:${part.name}`
  })
  const opened = opens
    ? html.replace(new RegExp(`<${root}(?=[\\s>])([^>]*)>`), (tag, attributes: string) =>
        /\sopen(?=[\s=>]|$)/.test(attributes) ? tag : `<${root} open${attributes}>`,
      )
    : html
  return `${opened.trimEnd()}\n<template data-preview-anatomy="${tokens.join(' ')}"></template>\n`
}

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

/**
 * A family's picture in the choosing table, or an empty tile of the same size
 * for a family with no example, so the rows still line up.
 */
function Picture({ slug }: { slug: string }) {
  const example = picturedBy(slug)
  if (!example) {
    return <span aria-hidden="true" className={api.picture} />
  }
  return (
    <FamilyPicture
      className={api.picture}
      css={example.css}
      html={withPicture(example.html, slug)}
      {...(example.layout ? { layout: example.layout as PreviewLayout } : {})}
    />
  )
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
  /* The Guidelines section, and its entry in the rail, where the family says
     when to use it or what to use instead. */
  const guided =
    family.use.length > 0 ||
    family.instead.length > 0 ||
    family.anatomy.length > 0 ||
    family.practice.length > 0
  /* The example the anatomy is drawn over: the styled headline, where there
     is one, since that is the tier a picture shows. */
  const pictured = headlines[0]
  /* Whether the root opens, which the anatomy frame opens it for, and lays
     out from the top so the surface has room under its trigger. */
  const openable = family.elements.some(
    (element) =>
      (element.tagName === `helix-${family.slug}` ||
        element.tagName === `helix-headless-${family.slug}`) &&
      element.properties.some((property) => property.name === 'open'),
  )
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
            largest space on the page: at `2xl` Import sits as far from Preview as
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
                  View source
                </a>
                <DocumentActions family={family.slug} headline={headline?.slug} />
              </helix-flex>
            </helix-flex>

            {/* **The other names under the summary**, so you arriving from
                another system's word sees at once that this is the family it
                meant. Tight against the summary, because the two are one
                statement of what the component is. */}
            <helix-flex direction="column" gap="2xs">
              <helix-text as="p" class={api.description} emphasis="muted" scale="caption">
                <CodeText>{first(prose)}</CodeText>
              </helix-text>
              {family.aliases.length > 0 && (
                <helix-text as="p" class={api.description} emphasis="muted" scale="caption">
                  Also called {listed(family.aliases)}.
                </helix-text>
              )}
            </helix-flex>

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

          <helix-flex direction="column" gap="md" id="import">
            <SectionHeading as="h2" label="Import" target="import">
              Import
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

          {guided && (
            <helix-flex direction="column" gap="md" id="guidelines">
              <SectionHeading as="h2" label="Guidelines" target="guidelines">
                Guidelines
              </SectionHeading>
              {/* **One table for choosing**, a row for each situation: a
                  picture of the family, the situation, and the family. This
                  family's rows come first, as one row with its situations
                  stacked, so its picture is drawn once. Each alternative
                  follows, and its whole row opens that family. */}
              {(family.use.length > 0 || family.instead.length > 0) && (
                <helix-flex direction="column" gap="sm">
                  <helix-text as="h3" scale="body-strong">
                    When to use
                  </helix-text>
                  <ul className={api.choices}>
                    {family.use.length > 0 && (
                      <li>
                        <div className={api.choice}>
                          <Picture slug={family.slug} />
                          <helix-flex class={api.choiceSituation} direction="column" gap="2xs">
                            {family.use.map((line) => (
                              <helix-text as="p" key={line} scale="body">
                                <CodeText>{line}</CodeText>
                              </helix-text>
                            ))}
                          </helix-flex>
                          <span className={api.choiceFamily}>
                            <helix-text scale="body-strong">{family.label}</helix-text>
                            <helix-text emphasis="muted" scale="caption">
                              This page
                            </helix-text>
                          </span>
                        </div>
                      </li>
                    )}
                    {family.instead.map((one) => (
                      <li key={one.slug}>
                        <Link
                          aria-label={`${one.label}: ${plainText(after(one.description))}`}
                          className={`${api.choice} ${api.choiceLink}`}
                          href={`/helix/components/${one.slug}`}
                        >
                          <Picture slug={one.slug} />
                          <helix-text as="span" class={api.choiceSituation} scale="body">
                            <CodeText>{one.description}</CodeText>
                          </helix-text>
                          <span className={api.choiceFamily}>
                            <helix-text class={api.choiceName} scale="body-strong">
                              {one.label}
                            </helix-text>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </helix-flex>
              )}
              {/* **How to use the family once it is chosen**, each rule in
                  bold with its reason under it, and the example it names
                  under that, in each tier the family ships it in. */}
              {family.practice.length > 0 && (
                <helix-flex direction="column" gap="sm">
                  <helix-text as="h3" scale="body-strong">
                    Using {family.label}
                  </helix-text>
                  <ol className={api.practice}>
                    {family.practice.map((one) => (
                      <li key={one.rule}>
                        <helix-flex direction="column" gap="2xs">
                          <helix-text scale="body-strong">
                            <CodeText>{one.rule}</CodeText>
                          </helix-text>
                          {one.reason && (
                            <helix-text emphasis="muted" scale="body">
                              <CodeText>{one.reason}</CodeText>
                            </helix-text>
                          )}
                          {family.examples
                            .filter((example) => one.example && example.slug === one.example)
                            .map((example) => (
                              <helix-code-block data-tier={example.tier} key={example.tier}>
                                <span
                                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                                  dangerouslySetInnerHTML={{
                                    __html: highlight(example.html.trim(), 'html'),
                                  }}
                                />
                              </helix-code-block>
                            ))}
                        </helix-flex>
                      </li>
                    ))}
                  </ol>
                </helix-flex>
              )}
              {/* **The parts, numbered over the running example**, and the
                  same numbers in a legend under it. The frame finds each part
                  in the live shadow roots, so a marker follows the part it
                  names. Each row says how to reach the part from your code:
                  its tag, its `::part()`, or its slot. */}
              {family.anatomy.length > 0 && pictured && (
                <helix-flex direction="column" gap="sm">
                  <helix-text as="h3" scale="body-strong">
                    Anatomy
                  </helix-text>
                  <AnatomyPreview
                    css={pictured.example.css}
                    html={withAnatomy(
                      pictured.example.html,
                      family.anatomy,
                      pictured.tier === 'headless'
                        ? `helix-headless-${family.slug}`
                        : `helix-${family.slug}`,
                      openable,
                    )}
                    {...(openable
                      ? { layout: 'padded' as const }
                      : pictured.example.layout
                        ? { layout: pictured.example.layout as PreviewLayout }
                        : {})}
                    {...(pictured.example.min ? { min: pictured.example.min } : {})}
                  />
                  <ol className={api.anatomy}>
                    {family.anatomy.map((part, at) => (
                      <li key={part.name}>
                        <span aria-hidden="true" className={api.anatomyNumber}>
                          {at + 1}
                        </span>
                        <helix-flex direction="column" gap="2xs">
                          <helix-flex align-items="baseline" gap="xs" wrap>
                            <CodeText>{`\`${reached(part)}\``}</CodeText>
                            {part.optional && (
                              <helix-text emphasis="muted" scale="caption">
                                Optional
                              </helix-text>
                            )}
                          </helix-flex>
                          {part.description && (
                            <helix-text emphasis="muted" scale="body">
                              <CodeText>{part.description}</CodeText>
                            </helix-text>
                          )}
                        </helix-flex>
                      </li>
                    ))}
                  </ol>
                </helix-flex>
              )}
            </helix-flex>
          )}

          <Anatomy elements={family.elements} native={native} web={web} />

          {/* Wide between one element and the next, tight inside each, or there
              is no seam between one element's API and another's. `2xl` because
              that is the top of `Flex`'s scale: the token `space-3xl` exists but
              the component does not offer it, which is the component being right
              about how far apart two things in one flow should ever be. */}
          <helix-flex direction="column" gap="2xl" id="api">
            <SectionHeading as="h2" label="API reference" target="api">
              API reference
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
                        <helix-text emphasis="muted" scale="caption">
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
          {SECTIONS.filter(
            (section) =>
              (section.id !== 'guidelines' || guided) &&
              (section.id !== ANATOMY_ID || elementsWithAnatomy(family.elements).length > 0),
          ).map((section) => (
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
