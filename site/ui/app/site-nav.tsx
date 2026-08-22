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

  /* How far down the glass reaches while a panel is open.
   *
   * **One filter, not two, and this is what it costs.** `backdrop-filter` is
   * clipped to its own element's box, so a bar and a panel each running their
   * own blur produce two different results and a line across the join: a 57
   * pixel box clamps a 16 pixel blur at both edges and averages flat, while the
   * tall panel keeps its structure. Turning the bar's filter off and keeping its
   * fill only moved the tell: the strip then showed the page sharp above a
   * boundary and blurred below it, which over text is worse.
   *
   * Neither component can span the other. The panel is a `popover` in the top
   * layer, so it cannot sit behind the bar, and the bar cannot grow to cover a
   * panel whose height it does not know. So the app paints one glass sheet
   * across both and turns the surface off in each: the bar's content is above
   * it at the sticky layer, and the panel's is above it in the top layer, so
   * both stay legible over a single continuous blur.
   *
   * Read from the panel after it has laid out, because `helix-open` fires
   * before it moves, which is the whole reason the bar can start changing on
   * the same frame the reveal starts. */
  const panelRef = useRef<HelixMegamenu>(null)
  const glassRef = useRef<HTMLDivElement>(null)
  const [glassSize, setGlassSize] = useState(0)

  /* Whether the sheet is the thing painting the masthead's strip.
   *
   * **The two swap, they do not fade into each other, and that is the fix.**
   * Three fading arrangements were built and each has its own artifact, because
   * two translucent layers cannot hand over by fading. One glass is 72%
   * coverage: held together they composite to 92% and the bar goes visibly
   * darker, crossed they dip to 59% and the page reads through, and released
   * early they fall to 45%. Every fade passes through a coverage that is not
   * one glass, and all three of those are visible.
   *
   * They are the same glass, so there is nothing to fade *between*. Switched,
   * coverage goes 72% to 72% and there is no event to see.
   *
   * Up on the frame the panel opens, since the sheet is painting from that
   * frame. Down one sheet-travel after the close begins, since the sheet holds
   * at full until the panel has finished collapsing and only then flips off. */
  const [sheetPaints, setSheetPaints] = useState(false)

  useEffect(() => {
    if (panelDown) {
      setSheetPaints(true)
      return
    }
    const glass = glassRef.current
    if (!glass) {
      setSheetPaints(false)
      return
    }
    /* The sheet's own delay, read off it rather than written down twice, so the
       two cannot drift and reduced motion resolves to zero and swaps at once. */
    const style = getComputedStyle(glass)
    const longest = (value: string) =>
      Math.max(0, ...value.split(',').map((part) => Number.parseFloat(part) || 0))
    const timer = setTimeout(() => setSheetPaints(false), longest(style.transitionDuration) * 1000)
    return () => clearTimeout(timer)
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
      {/* No line under the bar until the page moves.
       
          **The bar and the panel are one surface, and that is the app's call
          rather than either component's.** The band paints the same ground the
          header does and says in its own comment that it means to read as the
          header continuing downward. It cannot when the two are painted
          differently, which is exactly what happened while the bar was
          transparent over a hero and the band was opaque: the band appeared to
          start from nothing.
       
          Neither component can fix it. `Megamenu` does not know it is in a
          header, `AppHeader` does not know it contains a panel, and coupling
          them in the library would be a dependency between two things that are
          correctly independent. This is the one place that knows both.
       
          So while a panel is down the bar takes `material`, and the panel is
          given the same fill and the same blur through `--megamenu-background`
          and `--megamenu-backdrop`. Both glass together, rather than one of
          each with a seam down the join.

          **The panel's half of that is unconditional now, and it is a fix.**
          It was applied only while `panelDown`, which is cleared by
          `helix-close`, and that event is documented as firing *before* the
          panel closes. So the transparency came off on the frame the collapse
          began and the panel spent the whole of it painting
          `--helix-color-background`: a solid rectangle shrinking upward, black
          on a dark page. The panel is only ever on screen while it is open or
          collapsing, and the glass covers both, so it never needs a ground of
          its own here and the state it was keyed to was the wrong state. `AppHeader` transitions its own
          `background-color` over `--helix-duration-normal`, which is the
          duration the panel's reveal runs for, so they move together without
          either being told about the other. */}
      {/* Always rendered, and opened by an attribute rather than by mounting.
          
          Unmounted on close, the sheet vanished on the frame the panel began
          collapsing: nothing transitions out of the DOM. So it stays, and
          `data-open` drives a fade over the same duration the panel's own
          clip-path runs for. */}
      <div
        className="navGlass"
        data-open={panelDown ? '' : undefined}
        ref={glassRef}
        style={{ blockSize: `${glassSize}px` }}
      />

      <helix-app-header
        data-color-mode={pathname === '/preview/scale' ? 'dark' : undefined}
        material={onHero ? 'transparent' : undefined}
        sticky
        /* Follows the sheet exactly, and switches rather than fades.
         *
         * **`transition: none` is half the fix and the easier half to miss.**
         * Without it the bar still takes `normal` to empty, now over a sheet
         * that arrived in one frame, which is the doubled glass again with
         * extra steps. With it the bar stops painting on the frame the sheet
         * starts and starts again on the frame the sheet stops, and since the
         * two are the same glass a reader sees no event at all.
         *
         * Inline rather than in the stylesheet. It belongs to this exchange
         * rather than to the element, and a document rule setting `transition`
         * on a component that sets its own is exactly what `check:overruled`
         * exists to catch.
         *
         * At the top of a hero none of this shows, because
         * `material="transparent"` has no fill to take back. Scrolled, where
         * the same attribute takes the material, is the case with something to
         * see. */
        style={
          sheetPaints
            ? {
                '--app-header-backdrop': 'none',
                '--app-header-background': 'transparent',
                transition: 'none',
              }
            : undefined
        }
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
              onhelix-open={() => {
                setPanelDown(true)
                requestAnimationFrame(() => {
                  const panel = panelRef.current?.shadowRoot?.querySelector('[part="panel"]')
                  setGlassSize(panel ? panel.getBoundingClientRect().bottom : 0)
                })
              }}
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
