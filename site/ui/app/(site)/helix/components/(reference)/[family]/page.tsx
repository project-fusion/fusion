/* Server only, which is what makes this free. The highlighter is a Lezer parse
   and a tree walk, so it runs during the build and the page ships coloured
   markup with no client JavaScript spent on it. `helix/web` never sees it. */

import { startCase } from '@helix-io/docs'
import { highlight } from '@helix-io/sandbox/highlight'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import {
  type ApiMember,
  type Element,
  type Example,
  findFamily,
  getFamilies,
  type PropertyDoc,
} from '../../../../../../content/catalog/catalog'
import { sourceUrl } from '../../../../../../utils/source/source'
import styles from '../docs.module.css'
import { DocumentActions } from './document-actions'
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
 * The description column, one width for every table on the page.
 *
 * Fixed here and flexible everywhere else, which is the way round that makes
 * the page line up. Sizing the *first* column instead leaves the description
 * taking whatever is left, so a table with a Type column and one without end up
 * with their prose starting and ending in different places, and the six tables
 * in a section read as six unrelated shapes. Pinning the prose means a reader
 * scanning down the page is scanning one column.
 */
const DESCRIPTION = '26rem'

/**
 * The name column, which may never be narrower than the name in it.
 *
 * A column with no width falls back to `minmax(0, 1fr)`, and `0` is a floor
 * that lets the track shrink under its own content: `spotlightPadding`
 * measured 115px in a 99px cell and printed its last sixteen pixels over the
 * type beside it. The element already refuses to break, which is right for an
 * identifier, so without a floor on the track the name simply overflowed.
 *
 * `min-content` is the name itself, since the name cannot break, and `auto`
 * takes no more than that, so a table of short names stays as narrow as it
 * always was.
 */
const NAME = 'minmax(min-content, auto)'

/**
 * The type column, floored at the widest thing in it that cannot break.
 *
 * It was `minmax(8rem, 1fr)`, and a fixed floor is a guess about content: 8rem
 * is 128px and Accordion's `"single-collapsible"` needs 159, so the member
 * overflowed the track by 31px and printed over the column beside it. A union's
 * members are deliberately unbreakable, so the track has to be at least one
 * member wide or there is nowhere for it to go.
 *
 * `min-content` is that width and is never more than it needs. A signature is
 * one member and breaks at its spaces, so its `min-content` is a word rather
 * than the whole of it, and a column of short types stays narrow.
 */
const TYPE = 'minmax(min-content, 1fr)'

const first = (text: string): string => text.split('\n\n')[0] ?? ''

/**
 * Rows in alphabetical order, by the column a reader scans.
 *
 * The manifest emits members in source order, which is the order the component
 * author found convenient and carries no meaning for anyone reading the table.
 * Alphabetical is the order a reader can search without reading: looking for
 * `disabled` in a list of thirty properties is a scan when the list is sorted
 * and a full read when it is not.
 *
 * `localeCompare` rather than `<`, so the unnamed slot and any name with a
 * dash in it sort where a person would expect rather than where their code
 * points fall.
 */
const byName = <T extends { name: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.name.localeCompare(b.name))

/**
 * Examples alphabetically, with the headline held at the top.
 *
 * `default.html` is the family's canonical example rather than one of its
 * variants, which is why it reads as "Preview" and why both the plugin and the
 * catalog already put it first. Sorting the column flat would file it under P
 * among the variants it is meant to introduce, so the pin survives the sort and
 * everything after it is alphabetical.
 */
const byExample = (rows: Example[]): Example[] =>
  [...rows].sort((a, b) =>
    a.slug === 'default' || b.slug === 'default'
      ? Number(b.slug === 'default') - Number(a.slug === 'default')
      : a.label.localeCompare(b.label),
  )

function Code({ children }: { children: string }) {
  return (
    <helix-text class={styles.apiName} variant="code">
      {children}
    </helix-text>
  )
}

/*
 * Colours a type annotation by what each part of it is.
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
 * green is the tag color. Recolouring them would make the reference page
 * disagree with the editor two panes away, which is worse than either choice.
 */
/**
 * The built-in types, which are one color between them.
 *
 * `string` belongs here and not with the literals. It is the same kind of word
 * as `boolean`: a name the language supplies, sitting where a type goes.
 * `"primary"` is a different kind of thing entirely, a value standing in for a
 * type, and colouring the two alike made a union of literals read as though it
 * were a list of primitives.
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
 *
 * Same colours and the same quote swap, because it is still code and a reader
 * still copies it out. What it does not inherit is the union machinery.
 */
function DefaultText({ children }: { children: string }) {
  return (
    <helix-text class={styles.apiDefault} variant="code">
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
    <helix-text class={styles.apiType} variant="code">
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
          <span className={held ? styles.apiTypeMember : undefined}>
            {at > 0 && <span className={styles.apiTypeBar}>|</span>}
            {tokens(member)}
          </span>
        </Fragment>
      ))}
    </helix-text>
  )
}

/**
 * A union split into its members, so a wrap can only happen between them.
 *
 * The bar was loose text between tokens, which put it wherever the line
 * happened to end: a four-member union wrapped to four lines each trailing its
 * own `|`, and a longer one wrapped with the bar leading some lines and
 * trailing others, which reads as two different lists. Carried by the member it
 * introduces, it is always at the start of the line.
 *
 * **Depth-aware, because a union can be inside a generic.**
 * `Record<string, A | B>` is one member and splitting it on every bar would
 * make it three. Quotes are tracked too: a literal may contain anything.
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

/** One member, coloured by what each token is. */
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
 *
 * **A button rather than a bare glyph.** `Tooltip` shows on hover and on focus,
 * so a mark that is not focusable is a mark only a pointer ever reads, and this
 * is the case where that matters most: the heading is one invented word and a
 * keyboard reader has no other way to find out what it means. It does nothing
 * when pressed, which is the accessible pattern for a hint rather than a
 * control, and it carries the sentence as its own name so a screen reader hears
 * the explanation rather than the word "info".
 *
 * Only `Read` has one today. `Prop`, `Type`, `Slot` and `Event` are words a
 * reader arrives already knowing; `Read` is ours, and it is what somebody asked
 * about.
 */
function ColumnHint({ hint, label }: { hint: string; label: string }) {
  return (
    <helix-tooltip content={hint} placement="top">
      <button aria-label={`${label}: ${hint}`} className={styles.apiHint} type="button">
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
    <div className={styles.apiTable}>
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
                <span className={styles.apiUnnamed}>(default)</span>
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
 *
 * **Composed here rather than carried in the tag**, because the tag's job is to
 * name which specification a member is built on and this is copy about a link.
 * Written into each `@reference` it would be the same sentence in five places
 * and a rewording would be five edits in two packages.
 *
 * One string for both surfaces. It used to be `Invoker Commands. Opens the
 * specification.` in the bubble and `command: Invoker Commands` as the
 * accessible name, which is two phrasings of one thing and neither of them an
 * instruction. The row's own name is already the header of the row a reader is
 * in, so repeating it in the link only makes the announcement longer.
 */
const opens = (label: string): string => `Open the ${label} specification`

/**
 * A description, and the marks for whatever it is built on.
 *
 * One component for both tables, because both need it and only one had it.
 * `form` and `labels` are read-only, so they live in the Read table, and their
 * rows carried a reference in the manifest that nothing rendered: 96 of the 110
 * marks in the library were on members this cell was not being used for.
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
      <helix-text tone="muted" variant="caption">
        {first(description)}
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
            className={styles.apiReference}
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

/** The one table with a fourth column, because a property has a resting value. */
function PropertyTable({ rows }: { rows: PropertyDoc[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className={styles.apiTable}>
      <helix-table label="Properties">
        <helix-table-column width={NAME}>Prop</helix-table-column>
        <helix-table-column width={TYPE}>Type</helix-table-column>
        <helix-table-column>Default</helix-table-column>
        <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
        {byName(rows).map((row) => (
          <helix-table-row key={row.name}>
            <helix-table-cell header>
              <Code>{row.name}</Code>
            </helix-table-cell>
            <helix-table-cell>
              <TypeText>{row.type}</TypeText>
            </helix-table-cell>
            <helix-table-cell>
              {row.default && <DefaultText>{row.default}</DefaultText>}
            </helix-table-cell>
            <Described description={row.description} references={row.references} />
          </helix-table-row>
        ))}
      </helix-table>
    </div>
  )
}

/** One element's whole surface, six tables deep. */
function ElementApi({ element }: { element: Element }) {
  return (
    <helix-flex data-tier={element.tier} direction="column" gap="md" id={element.tagName}>
      {/* The part, not the family and the part: every heading under Avatar's
          API Reference began with the word Avatar, which the page has already
          said twice above.

          And the tag beside the heading rather than under it. `Root` and
          `helix-accordion` are one fact stated twice, a role and the name it
          answers to, and stacked they read as a heading followed by a first
          line of content. On the same line the name is plainly a label on the
          heading, and the section starts at its prose instead. */}
      <helix-flex align="center" data-density="sm" gap="sm" wrap>
        <helix-text as="h3">{element.part || element.label}</helix-text>
        <helix-tag>
          <helix-text variant="code">{element.tagName}</helix-text>
        </helix-tag>
      </helix-flex>

      {element.summary && (
        <helix-text as="p" class={styles.description} tone="muted" variant="caption">
          {element.summary}
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
     before it reaches a script tag. See 211. */
  const asked = (await searchParams).tier
  const forced = asked === 'base' || asked === 'styled' ? asked : undefined
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
  const source = sourceUrl(family.source)

  return (
    /* The shell and the rail are the layout's, so the nav survives a navigation
       between families and keeps the state a reader set on it. See #119. */
    <>
      {forced && (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: one of two literals this file chose
          dangerouslySetInnerHTML={{
            __html:
              forced === 'base'
                ? "document.documentElement.dataset.apiTier='base'"
                : 'delete document.documentElement.dataset.apiTier',
          }}
        />
      )}
      <article className={styles.docsMain}>
        {/* `3xl`, the top of the scale, because a section break should be the
            largest space on the page: at `2xl` Usage sat as far from Preview as
            Root sat from Group, so the page had one rhythm and no hierarchy.
            Said on the element rather than in `site.css`, which was overriding
            this very attribute from the document and winning silently. */}
        <helix-flex direction="column" gap="3xl">
          <helix-flex direction="column" gap="md">
            {/* Title and its actions on one line. The ellipsis holds everything
                that is about the *document* rather than about the component, so
                the one button worth a word of its own keeps it. */}
            <helix-flex align="center" class={styles.docsTitle} gap="md" justify="between">
              <helix-text as="h1">{family.label}</helix-text>
              <helix-flex align="center" data-density="sm" gap="xs">
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

            <helix-text as="p" class={styles.description} tone="muted" variant="caption">
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
            </helix-flex>
          </helix-flex>

          <helix-flex direction="column" gap="md" id="usage">
            <helix-text as="h2">Usage</helix-text>
            {/* The import, and only the import. There was a second block
                holding `<helix-accordion></helix-accordion>`, which is the tag
                the heading two lines above already says: a line of code that
                teaches nothing is still a line of code a reader has to read.
                And deliberately no CDN script tag: every package here is
                `private: true` and nothing is published, so a `<script src>`
                would be the one instruction on this page that cannot be
                followed. */}
            {family.elements.some((entry) => entry.tier === 'styled') && (
              <helix-code-block data-tier="styled">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(`import '@helix-io/web/${family.slug}'`, 'js'),
                  }}
                />
              </helix-code-block>
            )}
            {family.elements.some((entry) => entry.tier === 'headless') && (
              <helix-code-block data-tier="headless">
                <span
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
                  dangerouslySetInnerHTML={{
                    __html: highlight(`import '@helix-io/headless/${family.slug}'`, 'js'),
                  }}
                />
              </helix-code-block>
            )}
          </helix-flex>

          <helix-flex direction="column" gap="md" id="preview">
            <helix-text as="h2">Preview</helix-text>
            {/* The family's headline example, which is `default.html` and is
                first in the list by construction. A family with no examples
                shows nothing rather than an empty frame. */}
            {headline ? (
              <ComponentPreview
                css={headline.css}
                html={headline.html}
                sandboxHref={`/helix/sandbox?e=${family.slug}.${headline.slug}`}
              />
            ) : (
              <helix-empty>
                <helix-text tone="muted" variant="caption">
                  No example yet.
                </helix-text>
              </helix-empty>
            )}
          </helix-flex>

          {/* Wide between one element and the next, tight inside each. The two
              were `xl` and `lg`, near enough that a heading sat about as far
              from the table under it as from the whole section above it, so the
              page had no seam between one element's API and another's.
              `2xl` because that is the top of `Flex`'s scale: the token
              `space-3xl` exists but the component does not offer it, which is
              the component being right about how far apart two things in one
              flow should ever be. */}
          <helix-flex direction="column" gap="2xl" id="api">
            <helix-text as="h2">API Reference</helix-text>
            {family.elements.map((element) => (
              <ElementApi element={element} key={element.tagName} />
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
              <helix-text as="h2">Examples</helix-text>
              <helix-table label="Examples">
                <helix-table-column>Name</helix-table-column>
                <helix-table-column width={DESCRIPTION}>Description</helix-table-column>
                {byExample(family.examples).map((example) => (
                  <helix-table-row data-tier={example.tier} key={example.slug}>
                    <helix-table-cell header>
                      {/* `quiet`: a column where every row is a link does not
                          need every row underlined and blue. The variant carries
                          the muted color, drops the rule, and moves to full
                          foreground on hover. */}
                      <Link
                        data-link="quiet"
                        href={`/helix/sandbox?e=${family.slug}.${example.slug}`}
                      >
                        {example.label}
                      </Link>
                    </helix-table-cell>
                    {/* A dash where nobody has written one yet. An empty cell
                        reads as data that failed to load; a dash reads as a
                        blank someone still has to fill. */}
                    <helix-table-cell>
                      <helix-text tone="muted" variant="caption">
                        {example.description || '-'}
                      </helix-text>
                    </helix-table-cell>
                  </helix-table-row>
                ))}
              </helix-table>
            </helix-flex>
          )}
        </helix-flex>
      </article>

      <aside className={styles.docsRail}>
        {/* The real component, which computes what is current from where the
            headings actually are and writes `aria-current` onto these anchors.
            The list it replaced marked nothing at all, so the rail said where
            you could go and never where you were. */}
        {/* A visible heading, not only the accessible one. `label` names the
            navigation for a screen reader and paints nothing, so the rail was
            a column of links with no word saying what they were. */}
        <helix-text class={styles.docsRailTitle} tone="subtle" variant="label">
          On this page
        </helix-text>
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
