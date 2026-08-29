'use client'

import type { HelixAppHeader, HelixMegamenu } from '@fusion.dev/helix'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { Wordmark } from '@/components/wordmark/wordmark'
import { PRODUCTS } from '@/content/products/products'
import { stageAppearance } from '@/content/verticals/verticals'
import { MAILTO } from '@/utils/site/site'
import styles from '../chrome.module.css'

/**
 * The other two sections of the site, beside the Products panel.
 *
 * **Products, not the verticals.** A vertical is how the company is organized
 * and a product is what a reader uses: nobody uses Fusion Design, they use
 * Helix. A menu labeled Products that listed divisions would promise one thing
 * and hand over another, and `AGENTS.md` already draws that line by giving
 * verticals descriptive names and products evocative ones.
 *
 * The verticals are still one click away, in the panel's third column, because
 * dropping Energy and Capital to keep the column count tidy would be softening
 * them by omission. That is the one thing the stage labels exist to prevent.
 *
 * Ordered by what a reader is here to do rather than alphabetically: see what
 * we build, find out what is buyable, read the argument.
 */
const SECTIONS = [
  { href: '/services', label: 'Services' },
  { href: '/insights', label: 'Insights' },
]

/**
 * The top level, with every destination in it exactly once.
 *
 * A vertical is the company's map rather than a place to go, so it is not a row
 * here: listing both taxonomies puts `/helix` in the menu as Helix and as
 * Fusion Design with nothing telling a reader they are one page. `VerticalPage`
 * draws the same line, titling a page with the product and demoting the
 * vertical to an eyebrow over it.
 */
export const DESTINATIONS = [
  ...PRODUCTS.map((product) => ({ href: product.href, label: product.name })),
  ...SECTIONS,
]

/**
 * The site's destinations in a drawer, wherever a header has no room for them.
 *
 * Three headers use this and they arrive at it differently. The site's shows it
 * on a narrow viewport, where the bar cannot hold four words beside a search
 * field. The sandbox and the theme builder show it at every width, because a
 * tool's header is already full of the tool: what belongs in those is a way out,
 * and a way out is one button rather than a row of them.
 *
 * The state is the caller's. A drawer that owned its own would need the button
 * that opens it to reach inside, and every one of these has its button
 * somewhere different.
 */
export function SiteMenu({
  onOpenChange,
  onPreferences,
  open,
  placement = 'end',
}: {
  onOpenChange: (open: boolean) => void
  /**
   * Opens the preferences drawer, where the bar has no room to show its own
   * control.
   *
   * The panel closes first. Two drawers open at once is two scrims and two
   * things to dismiss, and the second arrives over the first from the same edge,
   * which reads as the panel having changed rather than as a new surface.
   */
  onPreferences?: () => void
  open: boolean
  /**
   * Which edge it arrives from, because a drawer comes from where it was
   * opened. The site's Menu sits at the end of the bar and its panel arrives
   * from the end; the tools put theirs ahead of the wordmark, so theirs arrives
   * from the start. A panel flying in from the opposite edge to the button that
   * summoned it reads as a second, unrelated thing appearing.
   */
  placement?: 'end' | 'start'
}) {
  const pathname = usePathname()

  return (
    <helix-drawer
      label="Site navigation"
      material="glass"
      onhelix-before-close={() => onOpenChange(false)}
      onhelix-before-open={() => onOpenChange(true)}
      open={open}
      placement={placement}
    >
      <div className={styles.navMenu}>
        {/* A tree, because the depth is real. A flat list of four destinations
            leaves everything a reader actually goes to inside Helix, the docs,
            the component reference, the sandbox, the theme builder, reachable
            only by landing on `/helix` first and looking for it.

            `helix-tree-item` with an `href` rather than a tree of buttons that
            navigate. The component's own docstring is explicit that this is the
            navigation flavor of the pattern: given an `href` the row is an
            `<a>`, so a middle click opens a tab and the platform provides
            everything a link provides. A tree of handlers would have taken all
            of that away to look the same. */}
        <helix-tree active={pathname} label="Site navigation">
          {PRODUCTS.map((product) => (
            <helix-tree-item
              /* Open where the reader already is. A tree that opens nothing
                 hides the current page behind a chevron, and the rows under a
                 product are the whole reason for the tree: a reader in the
                 sandbox should see Sandbox marked without hunting for it.
                 `default-open` and not `open`, because after that first paint
                 the branch is the reader's to open and shut. */
              default-open={pathname.startsWith(product.href)}
              key={product.href}
            >
              {product.name}
              {/* The product's own page as a row of its own, because the row
                  above it is not a link.

                  `helix-tree-item` does support both at once and says so: a
                  branch that is also a link goes where it points and its chevron
                  is what opens it. Two targets in one row is still two targets,
                  and on a touch screen the chevron is the smaller of them by
                  some margin. A parent that only discloses has one meaning
                  everywhere in the row, and the page it would have linked to is
                  the first thing inside it.

                  Only where nothing else already points there. Cortex's `Docs`
                  is `/cortex`, so Cortex needs no second row saying the same. */}
              {!product.destinations.some((destination) => destination.href === product.href) && (
                <helix-tree-item href={product.href} slot="children" value={product.href}>
                  Overview
                </helix-tree-item>
              )}
              {product.destinations.map((destination) =>
                /* A module named and not yet built takes no `href`, so the row
                   renders as a `div` and is not a link to nowhere. It keeps its
                   place in the tree because the shape of the product is the
                   point. */
                destination.stage ? (
                  <helix-tree-item key={destination.title} slot="children">
                    {destination.title}
                    <helix-tag
                      data-density="sm"
                      slot="end"
                      tone={stageAppearance(destination.stage)}
                    >
                      {destination.stage}
                    </helix-tag>
                  </helix-tree-item>
                ) : (
                  <helix-tree-item
                    href={destination.href}
                    key={destination.title}
                    slot="children"
                    value={destination.href}
                  >
                    {destination.title}
                  </helix-tree-item>
                ),
              )}
            </helix-tree-item>
          ))}
          {SECTIONS.map((section) => (
            <helix-tree-item href={section.href} key={section.href} value={section.href}>
              {section.label}
            </helix-tree-item>
          ))}
        </helix-tree>

        <a
          className={styles.navAction}
          data-button="solid"
          data-button-tone="primary"
          data-density="lg"
          href={MAILTO}
        >
          Get in touch
        </a>

        {/* **What the bar drops on a narrow screen, picked up here.**
            The masthead had a wordmark, a repository mark, a preferences button
            and a Menu on a 390px line, which is four targets and a logo in 342
            usable pixels. The two that are not navigation move into the panel
            the Menu already opens, so the bar carries the wordmark and one way
            in.

            Rows rather than the icon buttons they were. In a bar an icon with a
            tooltip is the whole control; in a panel every other line is a named
            row, and a lone glyph beside them reads as a thing that did not
            finish loading. The icon stays as the row's leading mark. */}
        {onPreferences && (
          <helix-flex class={styles.navExtras} direction="column" gap="2xs">
            <button className={styles.navExtra} onClick={onPreferences} type="button">
              <helix-icon name="gear"></helix-icon>
              Preferences
            </button>
            <a
              className={styles.navExtra}
              href="https://github.com/project-fusion"
              rel="noreferrer"
              target="_blank"
            >
              <helix-icon name="github-logo"></helix-icon>
              Source on GitHub
            </a>
          </helix-flex>
        )}
      </div>
    </helix-drawer>
  )
}

/**
 * Site navigation: the sections, centered in the masthead.
 *
 * Plain links inside a `Navigation`, marked with `aria-current` and styled by
 * the `data-navigation-item` recipe. Not tabs, because a tab controls a panel
 * and announces itself inside a `tablist`, and these are routes. Not a toggle
 * group either, which is a radio group and would announce a set of destinations
 * as a set of choices. The look was the only part navigation ever wanted from
 * either.
 *
 * The header's regions are named for where they are rather than what is in
 * them, so the wordmark is `start` and the actions are `end`. The `<nav>`
 * landmark and the traveling marker belong to `Navigation`.
 *
 * The current item comes from the pathname, so it is right on a cold load of
 * any URL rather than only after a click.
 *
 * **The header and the drawers are siblings, and have to be.** A filter, which
 * `backdrop-filter` is, makes an element a containing block for
 * `position: fixed` descendants: a drawer rendered inside the header is
 * positioned against the header, comes out one header tall, and shoves the
 * layout around. That is also why this component owns the header rather than
 * being slotted into one, and why the header is flat by default.
 */
export function SiteNav({ findable = [] }: { findable?: Findable[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const [prefsOpen, setPrefsOpen] = useState(false)
  const [panelDown, setPanelDown] = useState(false)

  const panelRef = useRef<HelixMegamenu>(null)
  const headerRef = useRef<HelixAppHeader>(null)

  /* Whether the bar has something under it, read off the bar rather than
     computed again.
   *
   * `AppHeader` already decides this, with a band around the threshold so a
   * page that rubber-bands does not flicker, and it carries the answer as the
   * custom state `scrolled`, announcing each crossing. A second scroll listener
   * here would be a second opinion on the same question and would eventually
   * disagree with the first. */
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const header = headerRef.current
    if (!header) {
      return
    }
    /* **The header says so, rather than being watched.** An attribute the
       element writes onto itself is markup the server never sent, so reading a
       `data-scrolled` with a `MutationObserver` costs every server-rendered
       consumer a hydration error. The threshold is a custom state, which is not
       in the DOM and so cannot be observed, and the header announces crossings
       instead.

       `matches` for the state it is already in, since a listener only hears the
       next change and a reload part-way down the page has already crossed. */
    setScrolled(header.matches(':state(scrolled)'))
    const hear = (event: Event) => {
      setScrolled((event as CustomEvent<{ scrolled: boolean }>).detail.scrolled)
    }
    header.addEventListener('helix-scrolled', hear)
    return () => header.removeEventListener('helix-scrolled', hear)
  }, [])

  /* How far down the sheet reaches. The bar's own height at rest, and the
     panel's bottom edge while one is down, which is the only number here the
     app has to go and measure.
   *
   * **An effect and an observer, not a frame callback.** `helix-before-open` fires
   * before the panel has moved, so the measurement cannot happen there, and the
   * obvious repair is to defer it a frame. A `requestAnimationFrame` never runs
   * in a background tab, so the sheet would open at the bar's own height and
   * stay there until something else re-rendered: measured exactly that way
   * here, where the panel reached 371 and the sheet held at 56.
   *
   * The effect's own call is synchronous after layout, which is the value that
   * matters, and the observer keeps it true when the panel's content or the
   * viewport changes under it. */
  const [panelBottom, setPanelBottom] = useState(0)

  useEffect(() => {
    /* `surface`, which is what the part is called, and it has to track the
       component's own name. A query that matches nothing is not an error: this
       returns early, the sheet stays at the bar's own height, and the only
       symptom is a navigation panel you can read the hero through. */
    const panel = panelRef.current?.shadowRoot?.querySelector('[part="surface"]')
    if (!panelDown || !panel) {
      return
    }
    const measure = () => setPanelBottom(panel.getBoundingClientRect().bottom)
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(panel)
    return () => watch.disconnect()
  }, [panelDown])

  const within = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  /* Gallery heroes and the scale candidate run up behind the masthead, so the
     bar has nothing to separate itself from until the page moves. Component
     pages under `/helix` keep a white top. */
  /* The landing page joins these because its hero draws an aura, and a bar with
     a fill of its own would cut a strip of flat background across the top of
     the light. `transparent` takes the fill back once anything scrolls under
     it, which is the state a hero is guaranteed not to still be in. */
  const onHero = pathname === '/' || pathname === '/helix' || pathname === '/insights'

  /* Products is current wherever a product is, which is the whole of what the
     panel contains. */
  const onProducts = PRODUCTS.some((product) => within(product.href))

  return (
    <>
      {/* The one glass, under both the bar and the panel.

          Always rendered and lit by an attribute rather than mounted on demand:
          unmounted, it would vanish on the frame the panel began collapsing,
          because nothing transitions out of the DOM. */}
      <div
        className={styles.navGlass}
        data-lit={scrolled || panelDown ? '' : undefined}
        style={panelDown && panelBottom ? { blockSize: `${panelBottom}px` } : undefined}
      />

      <helix-app-header
        /* Describes the page it is over, and nothing more. The sheet under it
         * does the painting in both states, so this no longer decides whether
         * the bar has glass: the hooks in `site.css` hold it clear at all
         * times. Kept because it is still true, and because the day the sheet
         * goes away this is what the bar falls back to. */
        material={onHero ? 'transparent' : undefined}
        ref={headerRef}
        sticky
      >
        <a data-link="quiet" href="/" slot="start">
          <Wordmark />
        </a>

        <helix-navigation class={styles.wideOnly} label="Sections">
          {/* `aria-current` on the host rather than on the trigger inside it.
                `Navigation` measures its marker against the elements assigned
                to its slot and reads `aria-current` off each, so the attribute
                has to be on the element that is actually in the row. The
                trigger is rendered in the megamenu's own shadow root, where the
                marker cannot see it, and where we could not write an attribute
                without slotting a replacement, which would cost the
                `aria-expanded` the component manages on its own button. */}
          {/* `suppressHydrationWarning`, for the same reason the gallery's
                options carry it: the element owns this node once it upgrades.
                It watches the viewport and writes `data-narrow` onto its own
                host to say the panel has become a band, which a custom element
                registering early does before React hydrates the subtree, so
                React finds an attribute on the server HTML that its own render
                never produced. The server cannot know the width, so this is
                expected rather than a symptom. */}
          <helix-megamenu
            class={styles.navPanel}
            label="Products"
            onhelix-before-close={() => setPanelDown(false)}
            /* Both fire before the panel moves and both are cancelable, so
                 the bar starts changing on the same frame the reveal starts
                 rather than a frame behind it. */
            onhelix-before-open={() => setPanelDown(true)}
            ref={panelRef}
            suppressHydrationWarning
            variant="full"
          >
            {/* The trigger is slotted, and it has to be.
               
                  `label` names the button the component renders in its own
                  shadow root, and this repo ships no declarative shadow DOM, so
                  that button does not exist until the bundle loads and the
                  element upgrades. Measured on `/helix`: the word `Products`
                  appeared in the served HTML only as an attribute, so the
                  masthead's first item was an empty box until hydration, and
                  because `aria-current` put the navigation's marker on that box
                  it drew a filled pill around nothing. With JavaScript off it
                  never arrived at all.
               
                  Slotted content is light DOM, so it ships with the page like
                  every other item in the bar. The component still owns the
                  disclosure: it carries `aria-expanded` and `aria-controls`
                  onto whatever is slotted here.
               
                  `aria-current` moves here with it, which is where it always
                  belonged. On the host it was read by `Navigation` to place the
                  marker and by nothing else, because a host with no role is not
                  something a screen reader announces a current state for. On the
                  button it does both.
               
                  `suppressHydrationWarning` here as well as on the host, because
                  the flag is per element and does not reach a child: the
                  megamenu writes `aria-expanded` and `aria-controls` onto this
                  button as soon as it upgrades, which is before React hydrates
                  the subtree, so React finds two attributes its own render never
                  produced. The disclosure state is the component's to own and
                  cannot be server-rendered, which is the case this flag is
                  for. */}
            <button
              aria-current={onProducts ? 'page' : undefined}
              data-navigation-item
              slot="trigger"
              suppressHydrationWarning
              type="button"
            >
              Products
            </button>
            {PRODUCTS.map((product) => (
              <div data-megamenu-group key={product.name}>
                {/* The mark sits with the name and nowhere else in the
                      column. `helix-icon` carries no label here: the words
                      beside it are the accessible reading, so the mark is
                      decoration rather than a second reading of the same
                      word. */}
                <h3 data-megamenu-heading>
                  <helix-icon name={product.mark}></helix-icon>
                  {product.name}. {product.role}
                </h3>
                {product.destinations.map((destination) =>
                  /* A module that is named and not yet built is a `div`, not a
                       disabled link. There is nowhere for it to go, so an anchor
                       would be a promise the href cannot keep, and
                       `aria-disabled` on a real link leaves it in the tab order
                       announcing itself as somewhere you cannot follow. A row
                       that is not interactive simply is not one. */
                  destination.stage ? (
                    <div data-megamenu-item data-soon key={destination.title}>
                      <strong>
                        {destination.title}
                        <helix-tag data-density="sm" tone={stageAppearance(destination.stage)}>
                          {destination.stage}
                        </helix-tag>
                      </strong>
                      <span>{destination.summary}</span>
                    </div>
                  ) : (
                    <Link
                      aria-current={pathname === destination.href ? 'page' : undefined}
                      data-megamenu-item
                      href={destination.href}
                      key={destination.href}
                    >
                      {/* Two rows, and the second is held to one line. A
                          summary that wraps turns a row of names into a
                          paragraph to read before choosing, so a narrow panel
                          truncates rather than reflows.

                          No mark down the side: one is on the column's heading,
                          and a glyph on every row under it reads as a set of
                          icons rather than a set of places to go. The row grid
                          leaves that column at `auto`, so these start where the
                          heading does. */}
                      <strong>{destination.title}</strong>
                      <span>{destination.summary}</span>
                    </Link>
                  ),
                )}
              </div>
            ))}
          </helix-megamenu>

          {SECTIONS.map((section) => (
            <Link
              aria-current={within(section.href) ? 'page' : undefined}
              href={section.href}
              key={section.href}
            >
              {section.label}
            </Link>
          ))}
        </helix-navigation>

        {/* The trigger and the palette both, from the one component the
            workbench renders too. Hidden on a narrow screen, where there is no
            keyboard to press the shortcut with and the drawer is the way
            through. */}
        <div className={styles.wideOnly} slot="end">
          <SiteFind findable={findable} />
        </div>

        {/* **Between the search and the preferences, and an anchor.** The two
            controls either side are `helix-icon-button`, which is a `button`
            and takes no `href`; `data-icon-link` is the recipe that gives a
            real link the same size and weight. Not hidden on a narrow screen
            the way the search is: the search needs a keyboard and this needs a
            tap. */}
        <helix-tooltip
          class={styles.wideOnly}
          content="Source on GitHub"
          placement="bottom"
          slot="end"
        >
          <a
            aria-label="Fusion source on GitHub"
            data-icon-link
            href="https://github.com/project-fusion"
            rel="noreferrer"
            target="_blank"
          >
            <helix-icon name="github-logo"></helix-icon>
          </a>
        </helix-tooltip>

        <helix-tooltip class={styles.wideOnly} content="Preferences" placement="bottom" slot="end">
          <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-tooltip>

        <helix-button
          class={styles.narrowOnly}
          emphasis="ghost"
          onClick={() => setOpen(true)}
          slot="end"
        >
          Menu
        </helix-button>
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/* The panel's three columns, stacked. A megamenu is a thing that hangs
          off a word in a row, and there is no row here: the drawer is already
          the disclosure, so nesting another one would be two things to open
          before reading a link. */}
      <SiteMenu
        onOpenChange={setOpen}
        onPreferences={() => {
          setOpen(false)
          setPrefsOpen(true)
        }}
        open={open}
      />
    </>
  )
}
