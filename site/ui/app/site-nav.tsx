'use client'

import type { HelixMegamenu } from '@helix-io/web'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PreferencesDrawer } from './preferences'
import { PRODUCTS } from './products'
import { type Findable, SiteFind } from './site-find'
import { stageAppearance, VERTICALS } from './verticals'
import { Wordmark } from './wordmark'

/**
 * The other two sections of the site, beside the Products panel.
 *
 * **Products, not the verticals, and that is the whole change.** A vertical is
 * how the company is organized and a product is what a reader uses: nobody uses
 * Fusion Design, they use Helix. A menu labelled Products that listed divisions
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
  const onHero =
    pathname === '/' ||
    pathname === '/helix' ||
    pathname === '/insights' ||
    pathname === '/preview/scale'

  /* Products is current wherever a product or a vertical is, which is what the
     panel actually contains. Checked against the verticals rather than the
     products because it is the wider set: `/energy` is in the panel and is not
     a product. */
  const onProducts = VERTICALS.some((vertical) => within(vertical.href))

  return (
    <>
      <helix-app-header
        data-color-mode={pathname === '/preview/scale' ? 'dark' : undefined}
        /* **A panel opening is the same event as scrolling, as far as the bar is
         * concerned: something is now under it that has to stay legible.**
         *
         * So the bar asks for `glass` while a panel is down, and that one word
         * covers both cases. Over a hero at the top, `transparent` has no fill,
         * and switching to `glass` fades one in over the component's own
         * `normal`, so the bar arrives with the panel. Scrolled, the bar is
         * already glass, and `[material="glass"]` and
         * `[material="transparent"][data-scrolled]` declare exactly the same
         * two properties, so asking for it again changes nothing at all.
         *
         * **This replaces a sheet, and the sheet is the thing to explain.** The
         * app used to paint one glass pane across the bar and the panel
         * together, turning the surface off in both, because two
         * `backdrop-filter` boxes blur differently and leave a line across the
         * join. It works, and it costs a handover: two translucent layers
         * cannot trade places by fading, since one glass is 72% coverage and
         * every fade passes through something else. Held together they
         * composite to 92% and the bar goes dark, crossed they dip to 59% and
         * the page reads through, released early they fall to 45%. Four
         * arrangements were built and all four were visible.
         *
         * The seam it was avoiding is not a seam here, because the panel starts
         * exactly at the bar's bottom edge: measured at 57 against a bar bottom
         * of 57, with and without a filter on the bar. Two glasses meeting on
         * that line read as the bar continuing downward, which is what the
         * panel's own comment says it is for. */
        material={panelDown ? 'glass' : onHero ? 'transparent' : undefined}
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
              appearance="full"
              label="Products"
              onhelix-close={() => setPanelDown(false)}
              /* Both fire before the panel moves and both are cancelable, so
                 the bar starts changing on the same frame the reveal starts
                 rather than a frame behind it. */
              onhelix-open={() => setPanelDown(true)}
              ref={panelRef}
              suppressHydrationWarning
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
                  <h3 data-megamenu-heading>
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
                          truncates rather than reflows. */}
                      <helix-icon name={destination.icon}></helix-icon>
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
          <helix-button appearance="ghost" onClick={() => setOpen(true)} slot="end">
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
        <helix-flex align="start" direction="column" gap="xl">
          <helix-flex align="start" direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Products
            </helix-text>
            {PRODUCTS.map((product) => (
              <a
                data-link
                data-link-size="lg"
                href={product.href}
                key={product.name}
                onClick={() => setOpen(false)}
              >
                {product.name}
              </a>
            ))}
          </helix-flex>

          <helix-flex align="start" direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Verticals
            </helix-text>
            {VERTICALS.map((vertical) => (
              <helix-flex align="center" data-density="sm" gap="sm" key={vertical.href}>
                <a data-link href={vertical.href} onClick={() => setOpen(false)}>
                  {vertical.name}
                </a>
                <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
              </helix-flex>
            ))}
          </helix-flex>

          <helix-flex align="start" direction="column" gap="sm">
            {SECTIONS.map((section) => (
              <a
                data-link
                data-link-size="lg"
                href={section.href}
                key={section.href}
                onClick={() => setOpen(false)}
              >
                {section.label}
              </a>
            ))}
          </helix-flex>

          <a
            data-button="solid"
            data-button-tone="primary"
            data-density="lg"
            href="mailto:hello@fusion.dev"
          >
            Get in touch
          </a>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
