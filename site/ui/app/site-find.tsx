'use client'

import type { HelixCommand } from '@helix-io/web'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Everywhere the palette can take a reader.
 *
 * The masthead shows two sections because a masthead is a place to stand, not
 * an index. A palette is the index, so it carries the pages a reader would
 * otherwise have to find by reading: the thesis, the trust page, the two
 * substrates, and the sections already on the bar.
 *
 * Written here rather than derived from a route manifest, because Next has no
 * such thing to read at runtime and a generated one would list every preview
 * and every slug. What belongs in a palette is a judgement about what somebody
 * would go looking for.
 *
 * Grouped by what a reader came for rather than by where the route sits: the
 * two substrates are things you take, the services are things you buy, and the
 * rest is things you read. A flat list of five was scannable and said nothing
 * about which of them were the same kind of answer.
 *
 * These are the pages a route manifest could not name usefully. Everything that
 * *is* enumerable, every component and every piece of writing, arrives as
 * `findable` from the layout, which can read the catalog and the registry
 * without either of them crossing into the browser.
 */
const DESTINATIONS: Findable[] = [
  {
    group: 'Products',
    items: [
      { href: '/helix', label: 'Helix, the design system' },
      { href: '/cortex', label: 'Cortex, memory and provenance' },
      /* The workbench, not the component. `Sandbox` is a family like any other
         and the catalogue already offers its reference page; this is the tool
         that page describes, which nothing else in the palette could reach. */
      { href: '/helix/sandbox', label: 'Sandbox, the component workbench' },
    ],
  },
  {
    group: 'Services',
    items: [{ href: '/services', label: 'What you can buy today' }],
  },
  {
    group: 'Reading',
    items: [
      { href: '/insights', label: 'Insights' },
      { href: '/thesis', label: 'Thesis' },
      { href: '/trust', label: 'Trust' },
    ],
  },
]

export interface Findable {
  group: string
  items: { alternate?: string; alternateLabel?: string; href: string; label: string }[]
}

/**
 * A group with its items ordered by how well they answer what was typed.
 *
 * **Within a group and never across one**, which is what the component's own
 * model allows and is also the right answer: `Listbox` filters by *hiding*
 * rather than removing, so the order it draws is the order it is given, and
 * lifting a component above a curated destination would mean pulling it out of
 * the heading that says what it is. The groups the reader just gained would
 * become decoration.
 *
 * Three tiers, because they are the three things "car" can mean: a label that
 * *starts* with it is almost certainly what was meant, a word inside the label
 * starting with it is next, and the rest is a substring that happened to match.
 * Ties keep the order they arrived in, which for components is alphabetical and
 * for writing is newest first, so the fallback is never arbitrary.
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
 * The search trigger and the palette behind it, for any header that wants one.
 *
 * **Extracted because two headers exist and only one of them had this.** The
 * site renders `SiteNav` and the workbench renders a header of its own, and
 * they differed in ways nobody could state: the palette and its trigger were on
 * the first and absent from the second, which is the request that surfaced the
 * whole question. A reader in the sandbox had no way to reach anything without
 * going back to the site first.
 *
 * **Extraction rather than unification, and the two are separable.** The
 * workbench's header is deliberately not the site's: `SandboxLayout` says
 * outright that this is a tool and every row of chrome around it is a row taken
 * from the thing being examined, which is right. So the shared piece is the
 * palette, not the header: each header keeps its own density, its own inset and
 * its own centre, and both render this.
 *
 * `findable` is built on a server and handed down, in both places. The
 * catalogue reads the manifest off disk and the insight registry is the whole
 * of the writing: a palette that imported either would pull it into the browser
 * to display a list of names. What crosses is the list.
 */
export function SiteFind({
  findable = [],
  trigger = true,
}: {
  findable?: Findable[]
  trigger?: boolean
}) {
  const router = useRouter()
  const palette = useRef<HelixCommand>(null)
  const [open, setOpen] = useState(false)
  const [needle, setNeedle] = useState('')

  /* **Bound here rather than as a prop, and the reason is worth keeping.**
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

  return (
    <>
      {/* **A button as well as a shortcut, because a shortcut nobody is told
          about is a feature for whoever wrote it.** The key is the fast path
          and the button is how a reader finds out there is one: it carries the
          keys it answers to, which is the only place on the page that says so.

          The workbench passes `trigger={false}`: its header is a tool's, every
          row of chrome is taken from the thing being examined, and the hotkey
          still works because the palette listens on the document. */}
      {trigger && (
        <helix-button
          appearance="outlined"
          class="siteFind"
          onClick={() => setOpen(true)}
          slot="end"
        >
          <helix-icon name="magnifying-glass" slot="start"></helix-icon>
          Search
          <helix-kbd slot="end">⌘K</helix-kbd>
        </helix-button>
      )}

      {/* **The palette listens for its own hotkey from the document**, so it
          answers from wherever the reader is, including from inside another
          field. `open` is controlled here because the button opens it too, and
          a controlled property that is not answered is a control that goes
          quiet: both events are bound. */}
      <helix-command
        class="siteCommand"
        hotkey="mod+k"
        label="Search"
        onhelix-close={() => {
          setOpen(false)
          setNeedle('')
        }}
        onhelix-open={() => setOpen(true)}
        onhelix-select={(event: { detail: { alternate?: boolean; value: string } }) => {
          setOpen(false)
          router.push(event.detail.value)
        }}
        open={open}
        placeholder="Search the site"
        ref={palette}
      >
        {/* **The catalogue arrives when it is asked for.** Every component and
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
                  key={one.href}
                  value={one.href}
                >
                  {one.label}
                </helix-option>
              ))}
            </helix-option-group>
          ),
        )}

        {/* **Four hints, and each one is a group rather than a clause.** They
            were a single sentence with commas doing the separating, which asks
            a reader to parse punctuation to find out where one key's job ends
            and the next begins. A key and the word for what it does are one
            object; the space between objects is what says so.

            The fourth is the second destination, which is why it is here rather
            than in the component: only this knows that a component row's
            alternate is its sandbox. */}
        <div className="siteCommandHints" slot="footer">
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
            <helix-kbd>⌘</helix-kbd>
            <helix-kbd>↵</helix-kbd>
            Sandbox
          </span>
          <span>
            <helix-kbd>Esc</helix-kbd>
            Close
          </span>
        </div>
        <helix-text appearance="caption" class="siteCommandMark" slot="footer">
          Fusion
        </helix-text>
      </helix-command>
    </>
  )
}
