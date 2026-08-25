'use client'

import type { HelixAppHeader, HelixMegamenu } from '@helix-io/styled'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { Wordmark } from '@/components/wordmark/wordmark'
import { PRODUCTS } from '@/content/products/products'
import { stageAppearance, VERTICALS } from '@/content/verticals/verticals'
import styles from '../chrome.module.css'

/**
 * The other two sections of the site, beside the Products panel.
 *
 * **Products, not the verticals, and that is the whole change.** A vertical is
 * how the company is organized and a product is what a reader uses: nobody uses
 * Fusion Design, they use Helix. A menu labeled Products that listed divisions
 * would promise one thing and hand over another, and `CLAUDE.md` already draws
 * that line by giving verticals descriptive names and products evocative ones.
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
  const [narrow, setNarrow] = useState(false)
  const [open, setOpen] = useState(false)

  const [prefsOpen, setPrefsOpen] = useState(false)
  const [panelDown, setPanelDown] = useState(false)

  const panelRef = useRef<HelixMegamenu>(null)
  const headerRef = useRef<HelixAppHeader>(null)

  /* Whether the bar has something under it, read off the bar rather than
     computed again.
   *
   * `AppHeader` already decides this, with a band around the threshold so a
   * page that rubber-bands does not flicker, and it reflects the answer as
   * `data-scrolled`. A second scroll listener here would be a second opinion on
   * the same question and would eventually disagree with the first. */
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const header = headerRef.current
    if (!header) {
      return
    }
    const sync = () => setScrolled(header.hasAttribute('data-scrolled'))
    sync()
    const watch = new MutationObserver(sync)
    watch.observe(header, { attributeFilter: ['data-scrolled'] })
    return () => watch.disconnect()
  }, [])

  /* How far down the sheet reaches. The bar's own height at rest, and the
     panel's bottom edge while one is down, which is the only number here the
     app has to go and measure.
   *
   * **An effect and an observer, not a frame callback.** `helix-open` fires
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
    /* `surface`, which is what the part is called. It was `panel`, and when the
       component renamed it this measurement went on asking for the old name,
       found nothing, and returned early: the sheet stayed at the bar's own
       height while the panel opened over the page with no glass behind it at
       all. Nothing failed, because a query that matches nothing is not an
       error, and the only symptom was a navigation panel you could read the
       hero through. */
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

  useEffect(() => {
    const query = window.matchMedia('(max-width: 48rem)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const within = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  /* Gallery heroes and the scale candidate run up behind the masthead, so the
     bar has nothing to separate itself from until the page moves. Component
     pages under `/helix` keep a white top. */
  /* The landing page joins these because its hero draws an aura, and a bar with
     a fill of its own would cut a strip of flat background across the top of
     the light. `transparent` takes the fill back once anything scrolls under
     it, which is the state a hero is guaranteed not to still be in. */
  const onHero = pathname === '/' || pathname === '/helix' || pathname === '/insights'

  /* Products is current wherever a product or a vertical is, which is what the
     panel actually contains. Checked against the verticals rather than the
     products because it is the wider set: `/energy` is in the panel and is not
     a product. */
  const onProducts = VERTICALS.some((vertical) => within(vertical.href))

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

        {!narrow && (
          <helix-navigation label="Sections">
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
              label="Products"
              onhelix-close={() => setPanelDown(false)}
              /* Both fire before the panel moves and both are cancelable, so
                 the bar starts changing on the same frame the reveal starts
                 rather than a frame behind it. */
              onhelix-open={() => setPanelDown(true)}
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
                  {product.destinations.map((destination) => (
                    <Link
                      aria-current={pathname === destination.href ? 'page' : undefined}
                      data-megamenu-item
                      href={destination.href}
                      key={destination.href}
                    >
                      {/* Two rows, and the second is one line. The sentence
                          earns its place, but a sentence that wraps turns a row
                          of names into a paragraph to read before choosing, and
                          the wrap is what made the panel long. Kept short
                          enough to fit, and held to one line so a narrow panel
                          truncates rather than reflows.
                       
                          No mark down the side. One is on the column's heading
                          now, and a glyph on every row under it made the panel
                          read as a set of icons rather than a set of places to
                          go. The row grid leaves that column at `auto`, so
                          these start where the heading does. */}
                      <strong>{destination.title}</strong>
                      <span>{destination.summary}</span>
                    </Link>
                  ))}
                </div>
              ))}

              {/* Plain anchors rather than `data-megamenu-item` rows, which the
                  base layer supports and which is the point: a vertical is the
                  map rather than a destination with a sentence about it, and
                  four more marked rows would read as four more products. The
                  stage rides along, because this is the first place a reader
                  meets Energy and Capital, and the label is what makes their
                  emptiness honest rather than disappointing. */}
              <div data-megamenu-group>
                <h3 data-megamenu-heading>Verticals</h3>
                {VERTICALS.map((vertical) => (
                  <Link
                    aria-current={within(vertical.href) ? 'page' : undefined}
                    href={vertical.href}
                    key={vertical.href}
                  >
                    <helix-flex align="center" data-density="sm" gap="sm" justify="between">
                      {vertical.name}
                      <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
                    </helix-flex>
                  </Link>
                ))}
              </div>
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
        )}

        {/* The trigger and the palette both, from the one component the
            workbench renders too. Hidden on a narrow screen, where there is no
            keyboard to press the shortcut with and the drawer is the way
            through. */}
        {!narrow && <SiteFind findable={findable} slot="end" />}

        <helix-tooltip content="Preferences" placement="bottom" slot="end">
          <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-tooltip>

        {narrow && (
          <helix-button emphasis="ghost" onClick={() => setOpen(true)} slot="end">
            Menu
          </helix-button>
        )}
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/* The panel's three columns, stacked. A megamenu is a thing that hangs
          off a word in a row, and there is no row here: the drawer is already
          the disclosure, so nesting another one would be two things to open
          before reading a link. */}
      <helix-drawer
        label="Site navigation"
        material="glass"
        onhelix-close={() => setOpen(false)}
        onhelix-open={() => setOpen(true)}
        open={open}
        placement="end"
      >
        <div className={styles.navMenu}>
          <div className={styles.navGroup}>
            <helix-text className={styles.navGroupLabel} tone="subtle" variant="label">
              Products
            </helix-text>
            {PRODUCTS.map((product) => (
              <a
                aria-current={pathname === product.href ? 'page' : undefined}
                className={styles.navItem}
                href={product.href}
                key={product.name}
                onClick={() => setOpen(false)}
              >
                {product.name}
              </a>
            ))}
          </div>

          <div className={styles.navGroup}>
            <helix-text className={styles.navGroupLabel} tone="subtle" variant="label">
              Verticals
            </helix-text>
            {/* The row is the link and the tag sits inside it, so the whole
                44px band is the target and the stages line up at the end. Held
                apart, each tag started wherever its own name stopped. */}
            {VERTICALS.map((vertical) => (
              <a
                aria-current={pathname === vertical.href ? 'page' : undefined}
                className={styles.navItem}
                href={vertical.href}
                key={vertical.href}
                onClick={() => setOpen(false)}
              >
                {vertical.name}
                <helix-tag data-density="sm" tone={stageAppearance(vertical.stage)}>
                  {vertical.stage}
                </helix-tag>
              </a>
            ))}
          </div>

          <div className={styles.navGroup}>
            {SECTIONS.map((section) => (
              <a
                aria-current={pathname === section.href ? 'page' : undefined}
                className={styles.navItem}
                href={section.href}
                key={section.href}
                onClick={() => setOpen(false)}
              >
                {section.label}
              </a>
            ))}
          </div>

          <a
            className={styles.navAction}
            data-button="solid"
            data-button-tone="primary"
            data-density="lg"
            href="mailto:hello@fusion.dev"
          >
            Get in touch
          </a>
        </div>
      </helix-drawer>
    </>
  )
}
