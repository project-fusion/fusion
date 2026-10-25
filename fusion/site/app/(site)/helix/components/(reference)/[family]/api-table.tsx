import { type CSSProperties, Fragment } from 'react'
import { CodeText } from '@/components/code-text/code-text'
import type { ApiMember, PropertyDoc } from '../../../../../../content/catalog/catalog'
import api from './page.module.css'

/*
 * The tables a reference page is built from, and the type, default, and name
 * text inside them, which the web and the native reference share.
 */
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
export const DESCRIPTION = '50%'

/**
 * The name column, which may never be narrower than the name in it.
 *
 * A column with no width falls back to `minmax(0, 1fr)`, and `0` is a floor
 * that lets the track shrink under its own content: `spotlightPadding`
 * measured 115px in a 99px cell and printed its last sixteen pixels over the
 * type beside it. The element already refuses to break, which is right for an
 * identifier, so without a floor on the track the name simply overflowed.
 */
export const NAME = 'minmax(min-content, auto)'

/**
 * The type column, floored at the widest thing in it that cannot break.
 *
 * A fixed floor is a guess about content: at `minmax(8rem, 1fr)`, 8rem is 128px
 * and Accordion's `"single-collapsible"` needs 159, so the member overflowed the
 * track by 31px and printed over the column beside it. A union's members are
 * deliberately unbreakable, so the track has to be at least one member wide or
 * there is nowhere for it to go.
 */
export const TYPE = 'minmax(min-content, 1fr)'

/**
 * The columns a table keeps once its descriptions move under their rows, which
 * the stylesheet hands the table where it is too narrow for the share: the name
 * and type as they were, or the name across the whole width.
 */
export const stacked = (typed: boolean): CSSProperties =>
  ({ '--api-stacked': typed ? `${NAME} ${TYPE}` : 'minmax(0, 1fr)' }) as CSSProperties

export const first = (text: string): string => text.split('\n\n')[0] ?? ''

/**
 * Rows in alphabetical order, by the column a reader scans.
 */
export const byName = <T extends { name: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.name.localeCompare(b.name))

export function Code({ children }: { children: string }) {
  return (
    <helix-text class={api.apiName} variant="code">
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
export function DefaultText({ children }: { children: string }) {
  return (
    <helix-text class={api.apiDefault} variant="code">
      {tokens(children.replace(/'([^']*)'/g, '"$1"'))}
    </helix-text>
  )
}

export function TypeText({ children }: { children: string }) {
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
    <helix-text class={api.apiType} variant="code">
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
export function MemberTable({
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
export function Described({
  description,
  references = [],
}: {
  description: string
  references?: { label: string; url: string }[]
}) {
  return (
    <helix-table-cell>
      <helix-text emphasis="muted" variant="caption">
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
export function PropertyTable({ rows }: { rows: PropertyDoc[] }) {
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
