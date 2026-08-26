'use client'

import type { HelixInput } from '@helix-io/styled'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import { HeroField } from '@/components/hero-field/hero-field'
import { useFocusOnLoad } from '@/hooks/use-focus-on-load/use-focus-on-load'
import { useSearchKey } from '@/hooks/use-search-key/use-search-key'
import type { Insight } from '../../../content/insights'
import browser from '../browser.module.css'
import styles from './insights.module.css'

/**
 * One post, reduced to what searching and filtering need.
 *
 * This is `Insight` itself rather than a narrowing of it, unlike the Helix
 * gallery's `BrowsableFamily`: the registry is already metadata-only and the
 * prose lives in `bodies.tsx`, which nothing here imports. There is nothing
 * left to strip.
 */
export type BrowsableInsight = Insight

const ALL = 'all'

const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

/**
 * The Insights hero, its filter bar, and the grid under both.
 *
 * The same split the Helix gallery uses, for the same reasons. **Sorting is a
 * URL parameter and the server does it; searching and filtering are not, and
 * the client does those.**
 *
 * Filtering hides cards, which CSS can do without touching the DOM, so the
 * order a keyboard walks and the order a reader sees stay the same thing.
 * Sorting reorders, and the obvious client-side trick, `order` on the grid
 * items, moves only the paint: focus order and the reading order of the
 * accessibility tree would still follow the DOM, so a reader tabbing through a
 * grid sorted oldest-first would visit it newest-first. That is a 2.4.3 failure
 * introduced for a convenience. Reordering on the server sidesteps it: the
 * markup arrives in the order it is shown, and the choice is shareable in a
 * link.
 *
 * **The cards arrive as `children`, already rendered on the server**, so the
 * filtering cannot remove children it never had. It writes a stylesheet naming
 * the slugs that did not match, which the grid's own `data-slug` attributes
 * answer. Slugs are checked against `[a-z0-9-]` before they reach that
 * stylesheet: nothing here is reader-supplied today, since they come from the
 * registry, but a value interpolated into CSS is a value interpolated into CSS.
 *
 * **Scoped by an attribute this file writes, never by a class the page does.**
 * It said `.insightGrid`, which is a CSS module identifier and reaches the
 * document as `insights-module__AoKrvW__insightGrid`, so the rule matched
 * nothing and every card stayed up. The same line was wrong on the component
 * gallery in the same way, and both were silent for the same reason: the URL,
 * the count and the empty state are all computed from `hidden`, so everything
 * downstream of the filter agreed it had run.
 *
 * No lattice and no shines. Those belong to a page whose cards are drawings on
 * that same field, and repeating them here would be decoration quoting a reason
 * that does not apply.
 */
export function InsightBrowser({
  children,
  index,
  initialKind,
  initialQuery,
  initialTopic,
  order,
  sorts,
}: {
  children: ReactNode
  index: BrowsableInsight[]
  /** From the URL, applied on the server so a shared link is already filtered. */
  initialKind: string
  initialQuery: string
  initialTopic: string
  /** The sort in force, which the server already applied. */
  order: string
  /** The sorts it will accept, so the options cannot name one it ignores. */
  sorts: string[]
}) {
  /* Seeded, not controlled. `default-value` hands the control its opening value
     and leaves it owning its own display; `value` would claim ownership and the
     control would go quiet, waiting to be told what to show by a consumer that
     is only listening. */
  const [query, setQuery] = useState(initialQuery)
  /* A ref only so the shortcut can reach the field. Insights does not focus on
     mount, unlike the gallery: the reasoning is beside the input. */
  const searchField = useRef<HelixInput>(null)
  const focusSearch = useSearchKey(searchField)

  /* Focused on arrival, matching the gallery.
   *
   * **This page refused it until 25 Aug 2026, and the argument is worth keeping
   * rather than deleting.** It ran: a reading page with six posts on it, where
   * pulling a screen reader past the heading and into a text box skips the one
   * line that says what the page is, to save a keystroke nobody was about to
   * make. That cost is real and is unchanged by this.
   *
   * What changed is the count and the consistency. The two galleries are the
   * same page shape and a reader should not have to learn which of them takes
   * the keyboard, and six posts is a floor rather than a ceiling: the argument
   * gets weaker with every piece published, and would have flipped on its own.
   *
   * `preventScroll`, as the gallery does, so focusing does not jump the page
   * past the hero it is sitting in. The `/` beside the field stays: it is what
   * gets a reader back to the search after they have scrolled away, which
   * focusing on load never did. */
  useFocusOnLoad(searchField)
  const [topic, setTopic] = useState(initialTopic || ALL)
  const [kind, setKind] = useState(initialKind || ALL)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  /**
   * Mirrors a filter into the URL without a navigation.
   *
   * `history.replaceState` rather than `router.replace`: the router would re-run
   * the server component on every keystroke to produce markup the client is
   * already showing. `replace` rather than `push`, so typing eight letters does
   * not put eight entries in the history and make Back mean "delete one
   * character". Sort is the exception and goes through the router, because the
   * server is what reorders the grid.
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

  /* Read off the posts, not declared beside them. A closed list would go stale
     against the registry the first time a post takes a topic nothing else has,
     and the select would offer a filter that matches nothing. */
  const topics = useMemo(
    () => [...new Set(index.map((insight) => insight.topic))].filter(Boolean).sort(),
    [index],
  )

  const kinds = useMemo(
    () => [...new Set(index.map((insight) => insight.kind))].filter(Boolean).sort(),
    [index],
  )

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
    const matched = index.filter((insight) => {
      if (topic !== ALL && insight.topic !== topic) {
        return false
      }
      if (kind !== ALL && insight.kind !== kind) {
        return false
      }
      if (!needle) {
        return true
      }
      return [insight.title, insight.summary, insight.topic, insight.kind]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    const keep = new Set(matched.map((insight) => insight.slug))
    return {
      hidden: index.map((insight) => insight.slug).filter((slug) => !keep.has(slug)),
      shown: matched.length,
    }
  }, [index, kind, query, topic])

  return (
    <>
      <section className={`${browser.pageHero} ${styles.insightsHero}`}>
        {/* Rays, on the reading that light being cast is what an insight looks
            like, and so that the two galleries do not read as one page twice.
            Absolute against the hero, which
            already isolates and positions itself for the lattice pseudo-element,
            so the light stays inside the band and `.pageHeroInner` keeps its
            raised layer above it. No `interactive`, so it never takes the hit
            test off the search field. */}
        <helix-aura
          bloom={0.62}
          class={styles.insightsAura}
          gain={1.15}
          scale={0.45}
          speed={0.5}
          variant="rays"
        ></helix-aura>
        <helix-flex align="center" className={browser.pageHeroInner} direction="column" gap="lg">
          <helix-flex align="center" data-density="sm" direction="column" gap="sm">
            <helix-tag>Fusion Development Group</helix-tag>
            <helix-text as="h1">Insights</helix-text>
            <helix-text as="p" className={browser.pageHeroLede}>
              The arguments behind what we build, written where they can be checked.
            </helix-text>
          </helix-flex>
          <helix-input
            className={`${browser.heroSearch} ${browser.chromeControl}`}
            default-value={initialQuery}
            label="Search insights"
            onhelix-input={(event) => {
              setQuery(event.detail.value)
              mirror('q', event.detail.value)
            }}
            placeholder={`Search ${index.length} posts…`}
            ref={searchField}
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
              default-value={topic}
              label="Topic"
              onhelix-change={(event) => {
                setTopic(event.detail.value)
                mirror('topic', event.detail.value)
              }}
            >
              <helix-icon name="funnel-simple" slot="start"></helix-icon>
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {/* `suppressHydrationWarning`, because the listbox owns this node
                  once it upgrades: it writes `data-active` onto whichever option
                  is current, which React's server HTML never produced. */}
              <helix-option suppressHydrationWarning value={ALL}>
                All topics
              </helix-option>
              {topics.map((name) => (
                <helix-option key={name} suppressHydrationWarning value={name}>
                  {name}
                </helix-option>
              ))}
            </helix-select>
            {kinds.length > 1 && (
              <helix-select
                className={`${browser.chromeControl} ${browser.filterControl}`}
                default-value={kind}
                label="Kind"
                onhelix-change={(event) => {
                  setKind(event.detail.value)
                  mirror('kind', event.detail.value)
                }}
              >
                <helix-icon name="funnel-simple" slot="start"></helix-icon>
                <helix-icon name="caret-down" slot="indicator"></helix-icon>
                <helix-option suppressHydrationWarning value={ALL}>
                  All kinds
                </helix-option>
                {kinds.map((name) => (
                  <helix-option key={name} suppressHydrationWarning value={name}>
                    {name}
                  </helix-option>
                ))}
              </helix-select>
            )}
          </helix-flex>
          <helix-flex align="center" className={browser.filterSort} gap="sm">
            {/* The count is announced and not shown. Filtering is a change
                nothing else reports, so a reader who cannot see the grid shrink
                needs to be told; a reader who can see it is being told twice. */}
            <helix-text aria-live="polite" className={browser.visuallyHidden}>
              {shown} of {index.length} posts
            </helix-text>
            <helix-select
              className={`${browser.chromeControl} ${browser.filterControl}`}
              default-value={order}
              label="Sort"
              onhelix-change={(event) => sortBy(event.detail.value)}
            >
              {/* A different mark from the filters', because it does a different
                  thing: a funnel takes rows away, and this only changes the
                  order they are in. */}
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
            Try a shorter word, or clear the topic filter.
          </helix-empty>
        ) : null}
        {children}
      </div>
    </>
  )
}
