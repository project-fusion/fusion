'use client'

import type { HelixCommand } from '@fusion.dev/helix'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ASK_PAGE, type AskFact, askHits, askOnPath } from './ask'
import styles from './site-find.module.css'

/**
 * Everywhere the palette can take a reader.
 */
const DESTINATIONS: Findable[] = [
  {
    group: 'Products',
    items: [
      { description: 'The design system', href: '/helix', label: 'Helix' },
      { description: 'Every family Helix ships', href: '/helix/components', label: 'Components' },
      { description: 'Memory and provenance', href: '/cortex', label: 'Cortex' },
      /* The workbench, not the component. `Sandbox` is a family like any other
         and the catalog already offers its reference page; this is the tool
         that page describes, which nothing else in the palette could reach. */
      { description: 'The component workbench', href: '/helix/sandbox', label: 'Sandbox' },
      /* The other tool, and the same reasoning: `@fusion.dev/helix-theme` is a package
         rather than a component family, so the catalog cannot offer it and
         nothing else in the palette could reach the thing that drives it. */
      { description: 'A palette and its audit', href: '/helix/theme', label: 'Theme builder' },
      /* Not a tool, and here for the opposite reason to the two above: nothing
         else reaches it. It is in `routes.ts`, so it is in the sitemap and in
         `llms.txt`, and there is no panel row and no link from any page.

         The link is here rather than from `motion.mdx`, which mentions the aura
         shader without linking it, because `@fusion.dev/helix-docs`
         is a content package and `/helix/aura` is this site's route. The
         package links its own pages relatively and describes the sandbox and
         the theme builder without linking either, which is the same boundary
         the manifest keeps when it records a path and lets the site compose the
         URL. Versioned MDX naming a live route would point every archived page
         at today's site. */
      { description: 'The field and its geometry', href: '/helix/aura', label: 'Aura' },
    ],
  },
  {
    group: 'Services',
    items: [
      { description: 'What you can buy today', href: '/company/services', label: 'Services' },
      { description: 'What to put in the first message', href: '/contact', label: 'Contact' },
    ],
  },
  {
    group: 'Reading',
    items: [
      { href: '/insights', label: 'Insights' },
      { href: '/company/thesis', label: 'Thesis' },
    ],
  },
]

export interface Findable {
  group: string
  items: {
    alternate?: string
    alternateLabel?: string
    /** A second line under the name, for what the destination actually is. */
    description?: string
    href: string
    label: string
  }[]
}

/**
 * A group with its items ordered by how well they answer what was typed.
 */
const ranked =
  (needle: string) =>
  (section: Findable): Findable => {
    const at = needle.toLowerCase()
    const tier = (label: string): number => {
      const text = label.toLowerCase()
      if (text.startsWith(at)) {
        return 0
      }
      return text.split(/[\s,]+/).some((word) => word.startsWith(at)) ? 1 : 2
    }
    return {
      group: section.group,
      items: section.items
        .map((item, order) => ({ item, order, tier: tier(item.label) }))
        .sort((a, b) => a.tier - b.tier || a.order - b.order)
        .map((one) => one.item),
    }
  }

/**
 * The listbox hides a row whose text does not contain the whole query.
 *
 * Ask ranks by tokens, so a question such as "how do I install" would hide
 * the install row. While Ask is showing, every row it ranked stays visible.
 */
const keepEveryRow = (): boolean => true

/** What the empty Ask page says when the question matches nothing published. */
const ASK_EMPTY = 'Nothing in the Helix manifest or the docs matches that.'

/**
 * Empties the field.
 *
 * The command clears the field when it changes page itself. Ask changes the
 * page from here, and the resting search is the curated list, so the field
 * is cleared the same way.
 */
const clearFilter = (host: HelixCommand): void => {
  host.shadowRoot
    ?.querySelector<Element & { requestFilter?: (next: string) => boolean }>('helix-listbox')
    ?.requestFilter?.('')
}

/**
 * The search trigger and the palette behind it, for any header that wants one.
 *
 * **Extraction rather than unification.** Two headers exist, the site's
 * `SiteNav` and the workbench's own, and the workbench's is deliberately not
 * the site's: `SandboxLayout` says outright that this is a tool and every row
 * of chrome around it is a row taken from the thing being examined. So the
 * shared piece is the palette, not the header: each header keeps its own
 * density, its own inset and its own center, and both render this. Without it a
 * reader in the sandbox cannot reach anything without going back to the site.
 */
export function SiteFind({
  ask = [],
  findable = [],
  slot,
  trigger = true,
}: {
  /**
   * Facts Ask may rank. Built on the server. Empty on a page that has no
   * corpus, which leaves the palette as search.
   */
  ask?: AskFact[]
  findable?: Findable[]
  /**
   * Which slot the trigger goes in, or `undefined` for whatever it is inside.
   */
  slot?: string | undefined
  trigger?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const palette = useRef<HelixCommand>(null)
  const [open, setOpen] = useState(false)
  const [needle, setNeedle] = useState('')
  const [asking, setAsking] = useState(false)
  const askHere = askOnPath(pathname) && ask.length > 0
  const hits = useMemo(() => (asking ? askHits(ask, needle) : []), [ask, asking, needle])

  /* **Bound here rather than as a prop.**
   *
   * `helix-filter` is composed, so it does cross out of the palette's shadow
   * root, but it is dispatched by the *listbox* inside it. `HelixElement`
   * repairs a React `on` prop by reading it at the moment the element itself
   * dispatches, which is what makes `onhelix-select` work on this same element:
   * an event merely passing through the host on its way up never calls the
   * host's own `dispatchEvent`, so nothing is there to do the repair and the
   * prop is recorded and never bound. Measured: typing narrowed the list and
   * the handler never ran.
   *
   * An effect is what the area rules leave for exactly this, a listener for
   * something the component did not raise itself. */
  useEffect(() => {
    const element = palette.current
    if (!element) {
      return
    }
    const heard = (event: Event): void => {
      setNeedle(((event as CustomEvent<{ value: string }>).detail.value ?? '').trim())
    }
    element.addEventListener('helix-filter', heard)
    return () => element.removeEventListener('helix-filter', heard)
  }, [])

  /* Backspace in an empty field is the command's own way back to search.
     The listener is on the window, which hears the key after the command has
     changed the page, and the state follows that. */
  useEffect(() => {
    const heard = (event: KeyboardEvent): void => {
      if (event.key !== 'Backspace') {
        return
      }
      const host = palette.current
      if (host === null || (event.target !== host && !host.contains(event.target as Node))) {
        return
      }
      setAsking(host.page === ASK_PAGE)
    }
    window.addEventListener('keydown', heard)
    return () => window.removeEventListener('keydown', heard)
  }, [])

  /* The page follows the mode once its rows are in the tree. The listbox would
     otherwise hide a ranked row whose text does not contain the whole question. */
  useEffect(() => {
    const host = palette.current
    if (!host) {
      return
    }
    if (asking) {
      host.filterMatch = keepEveryRow
      host.page = ASK_PAGE
      return
    }
    host.filterMatch = undefined
    if (host.page === ASK_PAGE) {
      host.page = ''
      clearFilter(host)
    }
  }, [asking])

  useEffect(() => {
    if (askHere) {
      return
    }
    setAsking(false)
  }, [askHere])

  const enterAsk = useCallback(() => {
    setAsking(true)
  }, [])

  const leaveAsk = useCallback(() => {
    setNeedle('')
    setAsking(false)
  }, [])

  const refuseAsk = useCallback(
    (event: Event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value
      if (value !== ASK_PAGE) {
        return
      }
      /* Refused, so the command's own page opener does not run. That opener
         clears the field, and the question the reader just typed is the
         question Ask should rank. */
      event.preventDefault()
      enterAsk()
    },
    [enterAsk],
  )

  return (
    <>
      {/* **A button as well as a shortcut, because a shortcut nobody is told
          about is a feature for whoever wrote it.** The key is the fast path
          and the button is how a reader finds out there is one: its tooltip
          names the keys it answers to, which is the only place on the page that
          says so. An icon button, like the controls beside it in every header.

          The workbench passes `trigger={false}`: its header is a tool's, every
          row of chrome is taken from the thing being examined, and the hotkey
          still works because the palette listens on the document. */}
      {trigger && (
        <helix-tooltip placement="bottom" slot={slot}>
          <helix-icon-button label="Search" onClick={() => setOpen(true)}>
            <helix-icon name="magnifying-glass"></helix-icon>
          </helix-icon-button>
          <span slot="content">
            Search <helix-kbd keys="mod+k"></helix-kbd>
          </span>
        </helix-tooltip>
      )}

      {/* **The palette listens for its own hotkey from the document**, so it
          answers from wherever the reader is, including from inside another
          field. `open` is bound here because the button opens it too, so the
          palette and the React state have to agree about which it is: both
          events are bound so neither can drift from the other.

          It opens only from the hotkey or the button. Nothing on the page
          opens it on load. */}
      <helix-command
        class={styles.siteCommand}
        empty-text={asking ? ASK_EMPTY : 'No commands'}
        hotkey="mod+k"
        label={asking ? 'Ask' : 'Search'}
        onhelix-before-close={() => {
          setOpen(false)
          setNeedle('')
          setAsking(false)
        }}
        onhelix-before-open={() => setOpen(true)}
        onhelix-before-select={refuseAsk}
        onhelix-select={(event: { detail: { alternate?: boolean; value: string } }) => {
          if (event.detail.value === ASK_PAGE) {
            enterAsk()
            return
          }
          setOpen(false)
          /* **The page a reader is on is already open**, so choosing it only
             closes the palette: a push to the same address scrolled nothing
             and added nothing, and a reload would throw away whatever the
             page was holding, a theme half built or a sandbox edited. */
          if (event.detail.value === pathname || !event.detail.value.startsWith('/')) {
            return
          }
          router.push(event.detail.value)
        }}
        open={open}
        placeholder={asking ? 'Ask about a component, a tag, or contrast' : 'Search the site'}
        ref={palette}
      >
        {/* **Ask is a page of this palette**, offered where the path is Helix
            docs, the component reference, the sandbox, or the theme builder.
            The row stays visible while a search is typed, because its filter
            text includes what was typed: choosing it ranks that question. */}
        {askHere && (
          <helix-option-group label="Ask">
            <helix-option
              description="From the manifest and the docs"
              opens={ASK_PAGE}
              text-value={needle === '' ? 'Ask' : `Ask ${needle}`}
              value={ASK_PAGE}
            >
              Ask
            </helix-option>
          </helix-option-group>
        )}

        {/* **The catalog arrives when it is asked for.** Every component and
            every article is the whole of what a palette can reach and none of
            what it should open with: a reader summoning it sees a hundred rows
            before typing a character, and a list nobody scans is a list that
            has to be searched anyway. So the curated few stand at rest, and
            everything enumerable appears on the first keystroke, which is when
            a name is a filter rather than an inventory. */}
        {[...DESTINATIONS, ...(needle === '' ? [] : findable.map(ranked(needle)))].map(
          (section) => (
            <helix-option-group key={section.group} label={section.group}>
              {section.items.map((one) => (
                <helix-option
                  alternate={one.alternate}
                  alternate-label={one.alternateLabel}
                  description={one.description}
                  key={one.href}
                  value={one.href}
                >
                  {one.label}
                </helix-option>
              ))}
            </helix-option-group>
          ),
        )}

        {asking && hits.length > 0 && (
          <helix-option-group label="Manifest and docs" slot={`page:${ASK_PAGE}`}>
            {hits.map((fact) => (
              <helix-option
                alternate={fact.sandbox}
                alternate-label={fact.sandbox === undefined ? undefined : 'Open in the sandbox'}
                description={fact.detail}
                key={fact.id}
                value={fact.href}
              >
                {fact.label}
                {fact.mark === undefined ? null : (
                  <span className={styles.askMark} slot="end">
                    {fact.mark}
                  </span>
                )}
              </helix-option>
            ))}
          </helix-option-group>
        )}

        {/*
         * *Four hints, and each one is a group rather than a clause.** A key
         *             and the word for what it does are one object, and the space between
         *             objects is what says so; run together in a sentence, a reader has to
         *             parse punctuation to find where one key's job ends.
         *
         * Ask adds Backspace, which the command already uses to leave a page.
         */}
        <div className={styles.siteCommandHints} slot="footer">
          <span>
            <helix-kbd>↑</helix-kbd>
            <helix-kbd>↓</helix-kbd>
            Move
          </span>
          <span>
            <helix-kbd>↵</helix-kbd>
            Go
          </span>
          <span>
            <helix-kbd keys="mod+enter"></helix-kbd>
            Sandbox
          </span>
          {asking ? (
            <span>
              <helix-kbd>⌫</helix-kbd>
              Search
            </span>
          ) : null}
          <span>
            <helix-kbd>Esc</helix-kbd>
            Close
          </span>
        </div>
        {asking ? (
          <button className={styles.askBack} onClick={leaveAsk} slot="footer" type="button">
            Search the site
          </button>
        ) : null}
        <helix-text class={styles.siteCommandMark} scale="caption" slot="footer">
          Fusion
        </helix-text>
      </helix-command>
    </>
  )
}
