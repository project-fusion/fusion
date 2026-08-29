'use client'

import type { HelixInput } from '@fusion.dev/helix'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import { HeroField } from '@/components/hero-field/hero-field'
import type { stageAppearance } from '@/content/verticals/verticals'
import { useFocusOnLoad } from '@/hooks/use-focus-on-load/use-focus-on-load'
import { useSearchKey } from '@/hooks/use-search-key/use-search-key'
import browser from '../../../browser.module.css'
import styles from './gallery.module.css'

/**
 * One family, reduced to what searching and filtering need.
 *
 * Deliberately not the `Family` the catalog returns. That carries every
 * element, attribute and example the manifest knows about, and all of it would
 * cross into the client bundle to answer a question about a name.
 */
export interface BrowsableFamily {
  aliases: string[]
  category: string
  label: string
  slug: string
  status: string
  summary: string
}

const ALL = 'all'

const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * The gallery's hero, its filter bar, and the grid under both.
 *
 * **The cards arrive as `children`, already rendered on the server.** They are
 * not built here and could not be: `ComponentArt` is hand-authored SVG drawings
 * across five modules, and rendering them from a client component would send
 * every one of them to the browser to support a text box. What crosses the
 * boundary instead is `index`, which is the handful of fields above.
 *
 * So the filtering cannot remove children it never had. It writes a stylesheet
 * naming the slugs that did not match, which the grid's own `data-slug`
 * attributes answer. That keeps the DOM whole, keeps the art on the server, and
 * means a card coming back is a repaint rather than a remount: nothing reloads
 * and no drawing restarts its motion.
 *
 * Slugs are checked against `[a-z0-9-]` before they reach that stylesheet.
 * Nothing here is reader-supplied today, since they come from the manifest, but
 * a value interpolated into CSS is a value interpolated into CSS.
 *
 * **The rule is scoped by an attribute this component writes, never by a class
 * the page does.** A CSS module identifier is hashed at build
 * (`gallery-module__uieGra__familyGrid`), so a rule naming `.familyGrid` matches
 * nothing, every card stays on screen, and nothing anywhere reports a fault.
 * `data-filtered-grid` sits on the band below, four lines from the rule that
 * reads it, and both are written here: a generated class name cannot be named
 * from a template string, and the way not to want to is to have nothing outside
 * this file to name.
 */
export function ComponentBrowser({
  children,
  eyebrow,
  index,
  initialCategory,
  initialQuery,
  initialStatus,
  lede,
  order,
  sorts,
  stage,
  stageTone,
  title,
}: {
  children: ReactNode
  /** The vertical's own name, worn as the eyebrow over the product's. */
  eyebrow: string
  index: BrowsableFamily[]
  /** From the URL, applied on the server so a shared link is already filtered. */
  initialCategory: string
  initialQuery: string
  initialStatus: string
  lede: string
  /** The sort in force, which the server already applied. */
  order: string
  /** The sorts it will accept, so the options cannot name one it ignores. */
  sorts: string[]
  stage: string
  /* The return of `stageAppearance`, which is a union rather than a string:
     typing it as one puts the widening on this side of the boundary, where the
     value is already known, instead of casting at the tag. */
  stageTone: ReturnType<typeof stageAppearance>
  title: string
}) {
  /* Seeded from the URL, and written onto the controls as `default-value`
     rather than `value`: the point is where they start, so a shared link shows
     its filters in the controls and not only in the grid. */
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory || ALL)
  const [status, setStatus] = useState(initialStatus || ALL)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  /**
   * Mirrors a filter into the URL without a navigation.
   *
   * `history.replaceState` rather than `router.replace`, and the difference is
   * the whole point: the router would re-run the server component on every
   * keystroke to produce markup the client is already showing, since searching
   * and filtering are done in CSS here. This writes the address bar and nothing
   * else, so the state is shareable, survives a reload and does not cost a
   * round trip per character.
   *
   * `replace` rather than `push`, so typing eight letters does not put eight
   * entries in the history and make Back mean "delete one character".
   *
   * Sort is the exception and goes through the router, because the server is
   * what reorders the grid.
   */
  const mirror = (key: string, value: string): void => {
    const next = new URLSearchParams(params)
    if (value && value !== ALL) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    const search = next.toString()
    window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname)
  }

  /* The categories present, read off the families exactly as the statuses are.
     A closed list lives in `metadata.ts`, which is where the vocabulary is
     checked; repeating it here would be a second copy to keep in step. */
  const categories = useMemo(
    () => [...new Set(index.map((family) => family.category))].filter(Boolean).sort(),
    [index],
  )

  /* Read off the families for the same reason: the vocabulary lives in
     `metadata.ts` (`deprecated`, `experimental`, `stable`), and a list written
     here can name a status no component may take. While one status covers the
     library this comes back with a single entry and the select is not rendered
     at all. */
  const statuses = useMemo(
    () => [...new Set(index.map((family) => family.status))].filter(Boolean).sort(),
    [index],
  )

  // A ref: the search is focused on mount, which no prop can do.
  const search = useRef<HelixInput>(null)
  const focusSearch = useSearchKey(search)

  /* Focus lands in the search on arrival.
   *
   * `preventScroll`, because focusing an element the browser thinks is out of
   * view scrolls it into view, and a reader arriving back here from a component
   * page has their old scroll position restored first. Without it the page
   * would silently jump to the top on every return, undoing the restore.
   *
   * Mount, not every render. Sorting pushes a new URL on the same route, which
   * re-renders this component without remounting it, so the effect does not run
   * again and focus is not pulled out of wherever the reader put it. Arriving
   * from another page does remount, which is the case being asked for.
   *
   * Worth knowing: focus on load means a screen reader starts at the search
   * rather than at the top of the document, so the heading above it is skipped
   * unless the reader goes back for it. That is the accepted trade on a page
   * whose whole purpose is finding one component out of the library, and it is
   * a trade rather than a free win. */
  useFocusOnLoad(search)

  /* A navigation rather than state, because the server owns the order. `scroll:
     false` so choosing a sort does not throw the reader back to the top of a
     page they were already reading down. */
  const sortBy = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('sort', value)
    router.push(`${pathname}?${next}`, { scroll: false })
  }

  const { hidden, shown } = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = index.filter((family) => {
      if (category !== ALL && family.category !== category) {
        return false
      }
      if (status !== ALL && family.status !== status) {
        return false
      }
      if (!needle) {
        return true
      }
      /* Aliases are in the haystack because they are the whole reason the
         manifest carries them: someone looking for "dropdown" wants Select. */
      return [family.label, family.summary, family.slug, ...family.aliases]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    const keep = new Set(matched.map((family) => family.slug))
    return {
      hidden: index.map((f) => f.slug).filter((slug) => !keep.has(slug)),
      shown: matched.length,
    }
  }, [category, index, query, status])

  return (
    <>
      <section className={`${browser.pageHero} ${styles.designHero}`}>
        <HeroField />
        <helix-flex align="center" className={browser.pageHeroInner} direction="column" gap="lg">
          {/* Eyebrow, title and lede are one block, and the lede belongs inside
           * it. At `sm` the block reads 12 / 12 internally against 24 to
           * whatever follows: a clean two to one. Left as a sibling of the
           * block it takes the outer `lg`, so a line describing the heading
           * immediately above it is spaced as the next unrelated thing on the
           * page.
           *
           * The tag is over the name rather than beside it. Alongside, it reads
           * as part of the title and pushes it off center. */}
          <helix-flex align="center" data-density="sm" direction="column" gap="sm">
            {/* Two marks, not one. The stage is the one label on this page that
                has to stay legible: `Building` means real work with nothing
                shipped, and folding it into an eyebrow that also names the
                vertical would soften it by omission. So the vertical names
                itself and the stage sits beside it, still in its own tone. */}
            <helix-flex align="center" gap="xs">
              <helix-tag>{eyebrow}</helix-tag>
              <helix-tag tone={stageTone}>{stage}</helix-tag>
            </helix-flex>
            <helix-text as="h1">{title}</helix-text>
            <helix-text as="p" className={browser.pageHeroLede}>
              {lede}
            </helix-text>
          </helix-flex>
          {/* "Components" rather than "families", and the count is the
              catalog's rather than the library's: one card each, not the number
              of custom elements, since Tabs is one card and two elements. The
              library says "family" wherever it has to tell a family from its
              parts, which is an authoring concern; a reader browsing meets the
              word nowhere else on the site, the route being `/helix/components`
              and the label above saying the same. */}
          <helix-input
            className={`${browser.heroSearch} ${browser.chromeControl}`}
            default-value={initialQuery}
            label="Search components"
            onInput={(event) => {
              setQuery(event.currentTarget.value)
              mirror('q', event.currentTarget.value)
            }}
            placeholder={`Search ${index.length} components…`}
            ref={search}
            type="search"
          >
            <helix-kbd
              keys="/"
              onhelix-shortcut={focusSearch}
              slot="end"
              within="document"
            ></helix-kbd>
            <helix-icon name="magnifying-glass" slot="start"></helix-icon>
          </helix-input>
          <helix-flex align="center" className="pageHeroActions" direction="column" gap="lg">
            {/* One control, not two buttons next to each other. The group
                flattens the inner corners and pulls the pair together by the
                border width, so they read as a single thing with two halves.
                That is also why neither is `primary`: a group welds its members
                into one shape, and one filled half beside one outlined half
                reads as a control that is half broken rather than as a choice.
                `data-button-width="standard"` keeps both at
                `--helix-size-button`, so the halves are equal rather than sized
                by how long their words happen to be.

                One word each, and a noun rather than a verb. These are links,
                and links get read out of context: a reader listing the page's
                links hears the label alone, with no hero around it to say what
                `Explore` would have meant. */}
            <helix-button-group>
              {/* An icon each, and neither of them an arrow. An arrow says
                  "onward" and nothing else, which is what the button's own
                  position already says; put one on a hero button and it is
                  decoration that happens to point right. */}
              <Link data-button data-button-width="standard" href="/helix/components/button">
                <helix-icon name="flag-banner-fold"></helix-icon>
                Start
              </Link>
              <Link data-button data-button-width="standard" href="/helix/sandbox">
                <helix-icon name="microscope"></helix-icon>
                Sandbox
              </Link>
            </helix-button-group>
          </helix-flex>
        </helix-flex>
      </section>

      <div className={browser.filterBar}>
        {/* Dense by nature, which is the rule app header and toolbar already
            follow: a bar of filters over a grid is chrome, and a control in it
            takes its height from the region rather than asking for one. */}
        <helix-flex
          align="center"
          className={browser.filterBarInner}
          data-density="sm"
          data-shell
          gap="md"
          justify="between"
          wrap
        >
          <helix-flex className={browser.filterGroup} gap="sm" wrap>
            <helix-select
              className={`${browser.chromeControl} ${browser.filterControl}`}
              default-value={category}
              label="Category"
              onChange={(event) => {
                setCategory(event.currentTarget.value)
                mirror('category', event.currentTarget.value)
              }}
            >
              <helix-icon name="funnel-simple" slot="start"></helix-icon>
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {/* `suppressHydrationWarning`, because the listbox owns this node
                  once it upgrades. It writes `data-active` onto whichever option
                  is current, and a custom element registering early can do that
                  before React hydrates the subtree, so React finds an attribute
                  on the server HTML that its own render never produced. This is
                  the case the flag exists for: the DOM here is written by
                  something that is not React, and the mismatch is expected
                  rather than a symptom. */}
              <helix-option suppressHydrationWarning value={ALL}>
                All categories
              </helix-option>
              {categories.map((name) => (
                <helix-option key={name} suppressHydrationWarning value={name}>
                  {titleCase(name)}
                </helix-option>
              ))}
            </helix-select>
            {statuses.length > 1 && (
              <helix-select
                className={`${browser.chromeControl} ${browser.filterControl}`}
                default-value={status}
                label="Status"
                onChange={(event) => {
                  setStatus(event.currentTarget.value)
                  mirror('status', event.currentTarget.value)
                }}
              >
                <helix-icon name="funnel-simple" slot="start"></helix-icon>
                <helix-icon name="caret-down" slot="indicator"></helix-icon>
                <helix-option suppressHydrationWarning value={ALL}>
                  All statuses
                </helix-option>
                {statuses.map((name) => (
                  <helix-option key={name} suppressHydrationWarning value={name}>
                    {titleCase(name)}
                  </helix-option>
                ))}
              </helix-select>
            )}
          </helix-flex>
          <helix-flex align="center" className={browser.filterSort} gap="sm">
            {/* The count is announced and not shown. Filtering is a change
                nothing else reports, so a reader who cannot see the grid shrink
                needs to be told; a reader who can see it is being told twice.
                `visuallyHidden` is the same treatment the control labels
                take. */}
            <helix-text aria-live="polite" className={browser.visuallyHidden}>
              {shown} of {index.length} components
            </helix-text>
            <helix-select
              className={`${browser.chromeControl} ${browser.filterControl}`}
              default-value={order}
              label="Sort"
              onChange={(event) => sortBy(event.currentTarget.value)}
            >
              {/* A different mark from the filters', because it does a
                  different thing: a funnel takes rows away, and this only
                  changes the order they are in. */}
              <helix-icon name="arrows-out-line-vertical" slot="start"></helix-icon>
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {sorts.map((name) => (
                <helix-option key={name} suppressHydrationWarning value={name}>
                  {titleCase(name)}
                </helix-option>
              ))}
            </helix-select>
          </helix-flex>
        </helix-flex>
      </div>

      {hidden.length > 0 && (
        <style>
          {hidden
            .filter((slug) => /^[a-z0-9-]+$/.test(slug))
            .map((slug) => `[data-filtered-grid] [data-slug="${slug}"]{display:none}`)
            .join('')}
        </style>
      )}

      <div className={browser.gridBand} data-filtered-grid data-shell>
        {shown === 0 ? (
          <helix-empty>
            <helix-text as="h2" slot="heading">
              Nothing matches
            </helix-text>
            Try a shorter word, or clear the group filter.
          </helix-empty>
        ) : null}
        {children}
      </div>
    </>
  )
}
