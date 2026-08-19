'use client'

import type { HelixInput, HelixSelect } from '@helix-io/web'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import type { stageAppearance } from '../../verticals'

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

/**
 * Which dots on the hero's lattice catch the light, and when.
 *
 * `[x, y, seconds, delay]`, where the first two are **percentages of the
 * section**, snapped in CSS to the nearest lattice dot with `round()`. The
 * percentage is what lets the field cover the whole hero at any width, and the
 * snap is what keeps a shine on a dot rather than near one: the lattice is a
 * tile of `--site-lattice-pitch` positioned `center`, so dots sit at the
 * section's center and at whole multiples of the pitch out from it. Fixed
 * offsets in pitches would hold that alignment and cluster in the middle of a
 * wide viewport, which is what these used to do.
 *
 * Written out rather than generated. A random position chosen at render time
 * differs between the server and the client, which is a hydration mismatch on
 * the largest element of the page. And scattered is not the same as uniform:
 * these are placed by eye in a band across the top and two flanks down the
 * sides, which leaves the corridor the heading, lede and search occupy mostly
 * clear without depending on a rule that only holds at one width.
 *
 * The durations are coprime on purpose. Given one period, all of them would
 * light in the same order every cycle and the sequence becomes recognisable;
 * at seventeen, nineteen, twenty-three and twenty-nine seconds the pattern does
 * not come back around for hours.
 */
const SHINE: readonly (readonly [number, number, number, number])[] = [
  // Across the top, where the lattice's mask leaves it strongest.
  [5, 14, 23, 0],
  [12, 8, 17, 6.2],
  [19, 20, 29, 2.4],
  [27, 11, 19, 11.5],
  [35, 18, 23, 8.1],
  [44, 7, 17, 3.7],
  [52, 22, 29, 14.6],
  [61, 10, 19, 5.3],
  [69, 19, 23, 12.8],
  [78, 9, 29, 1.6],
  [86, 21, 17, 9.4],
  [93, 13, 19, 15.2],
  // Down the left of the content column.
  [4, 38, 29, 7.1],
  [11, 58, 23, 13.9],
  [18, 44, 17, 4.5],
  [7, 74, 19, 10.2],
  [22, 66, 29, 0.8],
  [14, 86, 23, 16.4],
  // And the right.
  [96, 40, 17, 12.1],
  [88, 56, 19, 2.9],
  [79, 47, 23, 6.8],
  [93, 72, 29, 9.9],
  [82, 80, 17, 14.1],
  [75, 64, 19, 5.8],
]

const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * The gallery's hero, its filter bar, and the grid under both.
 *
 * **The cards arrive as `children`, already rendered on the server.** They are
 * not built here and could not be: `ComponentArt` is sixty-five hand-authored
 * SVG drawings across five modules, and rendering them from a client component
 * would send every one of them to the browser to support a text box. What
 * crosses the boundary instead is `index`, which is four strings per family.
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
  /* Seeded, not controlled. `default-value` hands the control its opening
     value and leaves it owning its own display; `value` would claim ownership
     and the control would go quiet, waiting to be told what to show by a
     consumer that is only listening. The filtering already worked from the URL
     before this: what was missing was the controls saying so, so a shared link
     filtered the grid while both selects read "All". */
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory || ALL)
  const [status, setStatus] = useState(initialStatus || ALL)
  /* Typed to the elements rather than to `HTMLElement`, which is what the JSX
     definitions expect and what makes `ref.current.value` reachable without a
     cast. Type-only imports, so nothing is added to the bundle. */
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
   * whose whole purpose is finding one of sixty-five things, and it is a trade
   * rather than a free win. */
  useEffect(() => {
    search.current?.focus({ preventScroll: true })
  }, [])

  /* Read off the families and nothing else.
   *
   * A declared list was wrong twice over. `beta` is not a value `@status` may
   * take, so the option could never match a component; and a hardcoded pair
   * would go stale against `metadata.ts`, which is where the vocabulary
   * actually lives (`deprecated`, `experimental`, `stable`).
   *
   * All sixty-five are `experimental` today, so this comes back with one entry
   * and the select is not rendered at all. It appears the day a second stage
   * exists, which is the day it can do something. */
  /* The categories present, read off the families exactly as the statuses are.
     A closed list lives in `metadata.ts`, which is where the vocabulary is
     checked; repeating it here would be a second copy to keep in step. */
  const categories = useMemo(
    () => [...new Set(index.map((family) => family.category))].filter(Boolean).sort(),
    [index],
  )

  const statuses = useMemo(
    () => [...new Set(index.map((family) => family.status))].filter(Boolean).sort(),
    [index],
  )

  // Still a ref: the search is focused on mount, which no prop can do.
  const search = useRef<HelixInput>(null)

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
      <section className="designHero">
        {/* One masked field, not twenty-four loose elements.
            
            The mask is the lattice's own, shared through a custom property, so
            a shine fades toward the edges exactly as the dots it sits among do.
            Given its own mask, or none, the periphery would light up where the
            field beneath has already faded to nothing, and a lone primary dot
            on empty background is a rendering fault rather than a texture.
            
            `aria-hidden` once on the container rather than on each child: this
            is decoration, and an element with no content still lands in the
            accessibility tree. */}
        <div aria-hidden="true" className="designHeroField">
          {SHINE.map(([x, y, seconds, delay]) => (
            <span
              className="designHeroShine"
              key={`${x}:${y}`}
              style={
                {
                  '--shine-delay': `${delay}s`,
                  '--shine-duration': `${seconds}s`,
                  '--shine-x': x,
                  '--shine-y': y,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <helix-flex align="center" className="designHeroInner" direction="column" gap="lg">
          {/* Eyebrow, title and lede are one block, and the lede was not in it.
           *
           * It sat as a sibling of the block in a column gapped `lg`, so the
           * space under the heading was 24, which is exactly the space from the
           * lede to the search. A line that describes the heading immediately
           * above it was spaced as though it were the next unrelated thing on
           * the page.
           *
           * Inside, at `sm`, the block reads 12 / 12 internally against 24 to
           * whatever follows it: a clean two to one, and the eyebrow keeps the
           * spacing it already had.
           *
           * The tag is over the name rather than beside it. Alongside, it read
           * as part of the title and pushed it off center. */}
          <helix-flex align="center" data-density="sm" direction="column" gap="sm">
            {/* Two marks, not one. The eyebrow was asked to name the vertical,
                and it was already carrying the stage, which is the one label on
                this page that has to stay legible: `Building` means real work
                with nothing shipped, and dropping it from the front of the
                gallery would soften it by omission. So the vertical names
                itself and the stage sits beside it, still in its own tone. */}
            <helix-flex align="center" gap="xs">
              <helix-tag>{eyebrow}</helix-tag>
              <helix-tag tone={stageTone}>{stage}</helix-tag>
            </helix-flex>
            <helix-text as="h1">{title}</helix-text>
            <helix-text as="p" className="designHeroLede">
              {lede}
            </helix-text>
          </helix-flex>
          <helix-input
            className="designSearch chromeControl"
            default-value={initialQuery}
            label="Search components"
            onhelix-change={(event) => {
              setQuery(event.detail.value)
              mirror('q', event.detail.value)
            }}
            placeholder={`Search ${index.length} components…`}
            ref={search}
            type="search"
          >
            <helix-icon name="magnifying-glass" slot="start"></helix-icon>
          </helix-input>
          <helix-flex align="center" className="designHeroActions" direction="column" gap="lg">
            {/* One control, not two buttons next to each other. The group
                flattens the inner corners and pulls the pair together by the
                border width, so they read as a single thing with two halves.
                That is also why neither is `primary`: a group welds its members
                into one shape, and one filled half beside one outlined half
                reads as a control that is half broken rather than as a choice.
                `data-button-fill="standard"` keeps both at
                `--helix-size-button`, so the halves are equal rather than sized
                by how long their words happen to be.

                One word each, and the second is a noun rather than a verb. A
                button group is two links, and links get read out of context: a
                reader listing the page's links hears the label alone, with no
                hero around it to say what `Explore` would have meant. `Sandbox`
                survives that because it names the place it goes. */}
            <helix-button-group>
              <Link data-button data-button-fill="standard" href="/design/components/button">
                Start
              </Link>
              <Link data-button data-button-fill="standard" href="/design/sandbox">
                Sandbox
              </Link>
            </helix-button-group>
          </helix-flex>
        </helix-flex>
      </section>

      <div className="designFilters">
        {/* Dense by nature, which is the rule app header and toolbar already
            follow: a bar of filters over a grid is chrome, and a control in it
            takes its height from the region rather than asking for one. */}
        <helix-flex
          align="center"
          className="designFiltersInner shell"
          data-density="sm"
          gap="md"
          justify="between"
          wrap
        >
          <helix-flex gap="sm" wrap>
            <helix-select
              className="chromeControl designFilter"
              default-value={category}
              label="Category"
              onhelix-change={(event) => {
                setCategory(event.detail.value)
                mirror('category', event.detail.value)
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
                className="chromeControl designFilter"
                default-value={status}
                label="Status"
                onhelix-change={(event) => {
                  setStatus(event.detail.value)
                  mirror('status', event.detail.value)
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
          <helix-flex align="center" gap="sm">
            {/* The count is still announced and no longer shown. Filtering is a
                change nothing else reports, so a reader who cannot see the grid
                shrink needs to be told; a reader who can see it is being told
                twice. `chromeControl` is the same visually-hidden treatment the
                labels take. */}
            <helix-text aria-live="polite" className="visuallyHidden">
              {shown} of {index.length} components
            </helix-text>
            <helix-select
              className="chromeControl designFilter"
              default-value={order}
              label="Sort"
              onhelix-change={(event) => sortBy(event.detail.value)}
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
            .map((slug) => `.familyGrid > [data-slug="${slug}"]{display:none}`)
            .join('')}
        </style>
      )}

      <div className="designGridBand shell">
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
