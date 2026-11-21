/* Server only, which is what makes this free. The highlighter is a Lezer parse
   and a tree walk, so it runs during the build and the page ships colored
   markup with no client JavaScript spent on it. `helix/styled` never sees it. */

import { startCase } from '@fusion.dev/helix-cem'
import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type CSSProperties, Fragment } from 'react'
import { CodeText, plainText } from '@/components/code-text/code-text'
import { docsShell } from '@/components/docs-shell/docs-shell'
import { SectionHeading } from '@/components/section-heading/section-heading'
import { pageMetadata } from '@/utils/metadata/metadata'
import {
  type AnatomyPart,
  type ApiMember,
  type Element,
  type Example,
  findFamily,
  getFamilies,
  type PropertyDoc,
} from '../../../../../../content/catalog/catalog'
import { sourceUrl } from '../../../../../../utils/source/source'
import { AnatomyPreview } from './anatomy'
import { DocumentActions } from './document-actions'
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
 * **The description column: one share of the table, the same in every table.**
 * Every table on the page is as wide as the column, so a share puts every
 * description at the same place and gives it the same width, whatever the
 * columns before it hold.
 *
 * A fixed `26rem` was the same width everywhere and started at a different
 * place in each table, because the columns before it are as wide as their
 * longest name, type, and default. On eleven pages those needed more than the
 * column had left, up to 418px on Number Input and Slider, so the table
 * scrolled sideways. With the default under the type, the widest pair of name
 * and type is 363px, on Notifications, so half of the 743px column is the
 * widest share that still fits every page.
 */
const DESCRIPTION = '50%'

/**
 * The name column, which may never be narrower than the name in it.
 *
 * A column with no width falls back to `minmax(0, 1fr)`, and `0` is a floor
 * that lets the track shrink under its own content: `spotlightPadding`
 * measured 115px in a 99px cell and printed its last sixteen pixels over the
 * type beside it. The element already refuses to break, which is right for an
 * identifier, so without a floor on the track the name simply overflowed.
 */
const NAME = 'minmax(min-content, auto)'

/**
 * The type column, floored at the widest thing in it that cannot break.
 *
 * A fixed floor is a guess about content: at `minmax(8rem, 1fr)`, 8rem is 128px
 * and Accordion's `"single-collapsible"` needs 159, so the member overflowed the
 * track by 31px and printed over the column beside it. A union's members are
 * deliberately unbreakable, so the track has to be at least one member wide or
 * there is nowhere for it to go.
 */
const TYPE = 'minmax(min-content, 1fr)'

/**
 * The columns a table keeps once its descriptions move under their rows, which
 * the stylesheet hands the table where it is too narrow for the share: the name
 * and type as they were, or the name across the whole width.
 */
const stacked = (typed: boolean): CSSProperties =>
  ({ '--api-stacked': typed ? `${NAME} ${TYPE}` : 'minmax(0, 1fr)' }) as CSSProperties

const first = (text: string): string => text.split('\n\n')[0] ?? ''

/**
 * Rows in alphabetical order, by the column a reader scans.
 */
const byName = <T extends { name: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.name.localeCompare(b.name))

/**
 * Examples alphabetically, with the headline held at the top.
 */
const byExample = (rows: Example[]): Example[] =>
  [...rows].sort((a, b) =>
    a.slug === 'default' || b.slug === 'default'
      ? Number(b.slug === 'default') - Number(a.slug === 'default')
      : a.label.localeCompare(b.label),
  )

function Code({ children }: { children: string }) {
  return (
    <helix-text class={api.apiName} scale="code">
      {children}
    </helix-text>
  )
}

/*
 * Colors a type annotation by what each part of it is.
 *
 * Split rather than highlighted: a type is not a program, and running a real
 * tokenizer over `'primary' | 'neutral'` would be a parser shipped to color
 * six words. The split keeps quoted literals whole and then treats every run of
 * identifier characters as one token, which is all the structure a type
 * annotation has.
 *
 * The palette is the library's own `syntax-*` tokens, so a type here is the
 * color the same word would be in the sandbox's editor. That is the reason
 * strings are not green: this set is GitHub-derived, where a string is navy and
 * green is the tag color. Recoloring them would make the reference page
 * disagree with the editor two panes away, which is worse than either choice.
 */
/**
 * The built-in types, which are one color between them.
 */
const BUILTIN = new Set([
  'any',
  'boolean',
  'false',
  'never',
  'null',
  'number',
  'string',
  'true',
  'undefined',
  'unknown',
  'void',
])

const kindOf = (token: string): string => {
  if (token.startsWith('"')) {
    return 'literal'
  }
  if (BUILTIN.has(token)) {
    return 'builtin'
  }
  return /^[A-Z]/.test(token) ? 'custom' : 'plain'
}

/**
 * A default value, which is a literal and not a type.
 *
 * **`TypeText` cannot render one, and using it for both is what put a value
 * through the other column's rules.** A union's members are held unbreakable so
 * a wrap can only happen between them and the bar starts the line; a default
 * has no members and may contain a space, and `"Show password"` in an 83px
 * column then had nowhere to break. Measured on Input: the text ran 108px in an
 * 83px box and the last nine landed on top of the description beside it.
 */
function DefaultText({ children }: { children: string }) {
  return (
    <helix-text class={api.apiDefault} scale="code">
      {tokens(children.replace(/'([^']*)'/g, '"$1"'))}
    </helix-text>
  )
}

function TypeText({ children }: { children: string }) {
  /* Double quotes, because that is what the rest of the library writes. The
     manifest records a literal exactly as the source spelled it, and the source
     is TypeScript where single quotes are the house style; a reader copying
     `"primary"` out of this table is putting it into HTML or JSX, where it is
     the wrong quote. Swapped on the way out rather than in the manifest, which
     should keep saying what the source says. */
  const members = union(children.replace(/'([^']*)'/g, '"$1"'))
  /* Unbreakable only where there is a bar to protect.
   *
   * The member class holds a member together so a union can only wrap between
   * its members. With one member there is no between, and holding it together
   * anyway is how `(options: FocusOptions) => void` came to run 223px in a
   * 147px column and print itself over the description: a signature is one
   * member, and it has spaces it would otherwise be glad to break at. */
  const held = members.length > 1
  return (
    <helix-text class={api.apiType} scale="code">
      {members.map((member, at) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a type is a fixed string, so position is its identity
        <Fragment key={at}>
          {/* The only place a union may break, and it has to be said out loud.
              The bar is attached by margin rather than by a space, so there is
              no whitespace between two members and therefore no break
              opportunity: a four-member union measured 298px and sat in a 128px
              cell, printing itself over the description. `<wbr>` is a break and
              no character, so the union still reads as one run and can still
              only fold where a member starts. */}
          {at > 0 && <wbr />}
          <span className={held ? api.apiTypeMember : undefined}>
            {at > 0 && <span className={api.apiTypeBar}>|</span>}
            {tokens(member)}
          </span>
        </Fragment>
      ))}
    </helix-text>
  )
}

/**
 * A union split into its members, so a wrap can only happen between them.
 */
const union = (type: string): string[] => {
  const members: string[] = []
  let depth = 0
  let quoted = false
  let from = 0
  for (let at = 0; at < type.length; at += 1) {
    const char = type[at]
    if (char === '"') {
      quoted = !quoted
    } else if (quoted) {
    } else if (char === '<' || char === '(' || char === '[' || char === '{') {
      depth += 1
    } else if (char === '>' || char === ')' || char === ']' || char === '}') {
      depth -= 1
    } else if (char === '|' && depth === 0) {
      members.push(type.slice(from, at))
      from = at + 1
    }
  }
  members.push(type.slice(from))
  return members.map((one) => one.trim()).filter(Boolean)
}

/** One member, colored by what each token is. */
function tokens(member: string) {
  const parts = member.split(/("[^"]*"|[A-Za-z_$][\w$]*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, index) =>
        /^("|[A-Za-z_$])/.test(part) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: a type is a fixed string, so position is its identity
          <span data-token={kindOf(part)} key={index}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

/**
 * What a column heading means, where one word cannot say it.
 */
function ColumnHint({ hint, label }: { hint: string; label: string }) {
  return (
    <helix-tooltip content={hint} placement="top">
      <button aria-label={`${label}: ${hint}`} className={api.apiHint} type="button">
        <helix-icon name="info" />
      </button>
    </helix-tooltip>
  )
}

/** Name, type, description. Slots and parts pass no type and get two columns. */
function MemberTable({
  hint,
  label,
  rows,
  typed = true,
}: {
  hint?: string
  label: string
  rows: ApiMember[]
  typed?: boolean
}) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className={api.apiTable} style={stacked(typed)}>
      <helix-table label={label}>
        <helix-table-column width={NAME}>
          {label}
          {hint && <ColumnHint hint={hint} label={label} />}
        </helix-table-column>
        {typed && <helix-table-column width={TYPE}>Type</helix-table-column>}
        <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
        {byName(rows).map((row) => (
          <helix-table-row key={row.name}>
            <helix-table-cell header>
              {/* The unnamed slot has no name, and printing `(default)` in the
                identifier color dressed an absence up as one. */}
              {row.name ? (
                <Code>{row.name}</Code>
              ) : (
                <span className={api.apiUnnamed}>(default)</span>
              )}
            </helix-table-cell>
            {typed && (
              <helix-table-cell>{row.type && <TypeText>{row.type}</TypeText>}</helix-table-cell>
            )}
            <Described description={row.description} references={row.references} />
          </helix-table-row>
        ))}
      </helix-table>
    </div>
  )
}

/**
 * What a reference mark says, in the tooltip and to a screen reader alike.
 */
const opens = (label: string): string => `Open the ${label} specification`

/**
 * A description, and the marks for whatever it is built on.
 *
 * One component for both tables, because both need it. `form` and `labels` are
 * read-only, so they live in the Read table, and a Read table without this cell
 * drops 96 of the library's 110 reference marks.
 */
function Described({
  description,
  references = [],
}: {
  description: string
  references?: { label: string; url: string }[]
}) {
  return (
    <helix-table-cell>
      <helix-text emphasis="muted" scale="caption">
        <CodeText>{first(description)}</CodeText>
      </helix-text>
      {references.map((reference) => (
        /* At the end of the row rather than beside the name, because it                     is secondary to both and the name is what a reader scans.                     An anchor inside the tooltip rather than the tooltip alone:                     the bubble says which feature this is and the mark goes                     there, so a touch screen, where nothing hovers, still has the                     destination. */ <helix-tooltip
          content={opens(reference.label)}
          key={reference.url}
          placement="top"
        >
          {' '}
          <a
            aria-label={opens(reference.label)}
            className={api.apiReference}
            href={reference.url}
            rel="noreferrer"
            target="_blank"
          >
            {' '}
            <helix-icon name="info" />{' '}
          </a>{' '}
        </helix-tooltip>
      ))}{' '}
    </helix-table-cell>
  )
}

/**
 * Name, type, description, as the other tables are. A property's resting value
 * sits under its type, which kept the default column out of the share every
 * other table gives its first two: with a column of its own, Prop, Type and
 * Default needed up to 418px of the 743px column on Number Input and Slider.
 */
function PropertyTable({ rows }: { rows: PropertyDoc[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className={api.apiTable} style={stacked(true)}>
      <helix-table label="Properties">
        <helix-table-column width={NAME}>Prop</helix-table-column>
        <helix-table-column width={TYPE}>Type</helix-table-column>
        <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
        {byName(rows).map((row) => (
          <helix-table-row key={row.name}>
            <helix-table-cell header>
              <Code>{row.name}</Code>
            </helix-table-cell>
            <helix-table-cell>
              <span className={api.apiTypeStack}>
                <TypeText>{row.type}</TypeText>
                {row.default && (
                  <span className={api.apiDefaultLine}>
                    <span className={api.apiDefaultLabel}>Default</span>
                    <DefaultText>{row.default}</DefaultText>
                  </span>
                )}
              </span>
            </helix-table-cell>
            <Described description={row.description} references={row.references} />
          </helix-table-row>
        ))}
      </helix-table>
    </div>
  )
}

/**
 * One element's whole surface, six tables deep.
 *
 * **Its own status where it differs from its family's.** The header states the
 * family's status, read from its root, and an add-on's element can join a
 * family at another one: `helix-sandbox-editor` is experimental in the stable
 * Sandbox family, and the page called it nothing but stable. The tag is the
 * one the header uses, so the two read as the same fact.
 */
function ElementApi({ element, familyStatus }: { element: Element; familyStatus: string }) {
  return (
    <helix-flex data-tier={element.tier} direction="column" gap="md" id={element.tagName}>
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
    path: `/design/components/${family.slug}`,
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
              {family.status && <helix-tag>{startCase(family.status)}</helix-tag>}
              {family.since && <helix-tag>Since {family.since}</helix-tag>}
              {family.category && <helix-tag>{startCase(family.category)}</helix-tag>}
            </helix-flex>
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
              <helix-code-block data-tier="styled">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(imports('styled'), 'js'),
                  }}
                />
              </helix-code-block>
            )}
            {family.elements.some((entry) => entry.tier === 'headless') && (
              <helix-code-block data-tier="headless">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(imports('headless'), 'js'),
                  }}
                />
              </helix-code-block>
            )}
          </helix-flex>

          <helix-flex direction="column" gap="md" id="preview">
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
                    sandboxHref={`/design/sandbox?e=${family.slug}.${example.slug}${
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
                          href={`/design/components/${one.slug}`}
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
              <ElementApi element={element} familyStatus={family.status} key={element.tagName} />
            ))}
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
                          href={`/design/sandbox?e=${family.slug}.${example.slug}${
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
                          {example.description ? <CodeText>{example.description}</CodeText> : '-'}
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
          {SECTIONS.filter((section) => section.id !== 'guidelines' || guided).map((section) => (
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
              {element.part || element.label}
            </a>
          ))}
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
