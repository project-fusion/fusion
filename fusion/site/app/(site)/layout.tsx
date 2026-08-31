import Link from 'next/link'
import type { ReactNode } from 'react'
import { HelixElements } from '@/components/helix-elements/helix-elements'
import { SiteNav } from '@/components/site-nav/site-nav'
import { PRODUCTS } from '@/content/products/products'
import styles from '../../components/chrome.module.css'
import { type RouteKind, routes } from '../../content/routes/routes'
import { RevealOnScroll } from './reveal-on-scroll'

/**
 * What the footer links, in three groups.
 *
 * **A footer is where a reader goes when the page did not answer them**, so it
 * carries the whole site rather than the two legal pages that prompted it. The
 * products come from `PRODUCTS` rather than being written again here: a footer
 * that lists them separately is a second list to keep in step, which is exactly
 * the drift the destinations module exists to remove.
 *
 * Legal is its own group rather than a line under the tagline. Terms and Privacy
 * are what a reader scans a footer for, and burying them beside a slogan is how
 * a site technically links them without anybody finding them.
 */

const FOOTER_GROUPS = [
  {
    heading: 'Products',
    items: PRODUCTS.map((product) => ({ href: product.href, label: product.name })),
  },
  {
    heading: 'Company',
    items: [
      { href: '/services', label: 'Services' },
      { href: '/insights', label: 'Insights' },
      { href: '/thesis', label: 'Thesis' },
      { href: '/trust', label: 'Trust' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { href: '/terms', label: 'Terms of use' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/acceptable-use', label: 'Acceptable use' },
    ],
  },
]

/**
 * Where to find us, under the mark.
 *
 * **An empty `href` renders nothing**, so an account named before it exists can
 * sit here. Never guess the slug: a guessed `linkedin.com/company/...` is a link
 * to whoever does own it.
 */
const SOCIALS = [
  { href: 'https://github.com/project-fusion', icon: 'github-logo', label: 'Fusion on GitHub' },
  {
    href: 'https://www.linkedin.com/company/project-fusion',
    icon: 'linkedin-logo',
    label: 'Fusion on LinkedIn',
  },
  { href: 'https://x.com/fusiondotdev', icon: 'x-logo', label: 'Fusion on X' },
] as const

/** The registry's routes of one kind, as palette items. */
const findable = (kind: RouteKind) =>
  routes()
    .filter((route) => route.kind === kind)
    .map((route) => ({ description: route.description, href: route.path, label: route.title }))

/**
 * Header, content column, and footer: everything except the tools.
 *
 * The header and footer run the full width of the viewport and are inset by
 * `space-2xl` rather than by the page's own `--site-inset`, so the wordmark and
 * the copyright start on the same line down the left edge. That clamp opens to
 * seven rem on a wide screen, which is right for a column of prose and wrong
 * for chrome: taking it here puts the two edges 48 pixels apart at 1600. The
 * content column between them keeps the clamp.
 *
 * `view-transition-name` on the content is what makes a route change a
 * cross-fade of the middle of the page while the header and its indicator stay
 * put. The name has to be unique per document, which is why it is here on the
 * one main rather than on anything a page renders.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Registered here rather than in the root layout, which is an ancestor of
          the spec runner and cannot register anything without giving that page
          two copies of the library. */}
      <HelixElements />
      {/* **Built here, on the server, and handed down.** The registry reads the
          manifest off disk and holds the whole of the writing: it belongs to a
          server component, and a palette that imported it would pull the
          manifest into the client bundle to display a list of names. What
          crosses is the list.

          **From `routes()` rather than from hand-picked arrays.** Anything left
          out of such an array is simply unreachable from the palette, on a site
          whose largest section is documentation, and `turbo run routes -- --check` already
          holds the registry that the sitemap and `llms.txt` are built from. A
          second copy of it here would drift.

          **`Route.description` is the caption**, which is what its own comment
          says it is for: `llms.txt` *and a search result*. Matching is still on
          the title, so what somebody types is measured against the name rather
          than against prose about it. */}
      <SiteNav
        findable={[
          { group: 'Components', items: findable('component') },
          { group: 'Documentation', items: findable('doc') },
          { group: 'Writing', items: findable('insight') },
        ]}
      />
      <main style={{ viewTransitionName: 'site-content' }}>{children}</main>
      <RevealOnScroll />

      <footer className={styles.siteFooter} data-site-footer>
        {/* `data-site-footer` stays whatever else changes here: the Aura page
            hides the footer with `[data-site-footer]` from a plain stylesheet,
            and a CSS module rewrites class names, so the mark is the only thing
            that selector can reach. */}
        <div className={styles.footerInner} data-shell>
          {/* Three children of one grid rather than a row with a line under it:
              the mark takes a column, and the two lines of type share the other
              one. See `footerBrand` for why the indent is derived rather than
              measured. */}
          <div className={styles.footerBrand}>
            <helix-icon
              className={styles.fusionLogo}
              label="Fusion"
              name="fusion"
              style={{ '--icon-size': '1.25rem' }}
            />
            {/* **The name leads and the line under it recedes.** Not `caption`
                for the name and `label` for the tagline: `label` is the
                small-and-firm variant meant for a field's name, 500 against a
                caption's 400 and one pixel smaller, so that pairing reads as the
                company being the caption of its own slogan. */}
            <helix-text variant="body-strong">Fusion Development Group</helix-text>
            <helix-text tone="subtle" variant="caption">
              Developing for humanity.
            </helix-text>

            {/* **Anchors, not `helix-icon-button`.** That component is a
                `button` and takes no `href`, which is the rule its own docs
                state: a component that navigates renders its own anchor, and
                this one does not navigate. Wrapping a button in a link to get
                one is the third option the same page rules out. So these are
                links wearing `data-icon-link`, the site recipe that gives them
                the size and weight of the icon buttons they sit beside, and
                `aria-label` does the naming the glyph cannot. */}
            <helix-flex class={styles.footerSocials} gap="2xs">
              {SOCIALS.filter((one) => one.href).map((one) => (
                <a
                  aria-label={one.label}
                  data-icon-link
                  href={one.href}
                  key={one.icon}
                  rel="noreferrer"
                  target="_blank"
                >
                  <helix-icon name={one.icon}></helix-icon>
                </a>
              ))}
            </helix-flex>
          </div>

          <nav aria-label="Footer" className={styles.footerNav}>
            {FOOTER_GROUPS.map((group) => (
              <div className={styles.footerGroup} key={group.heading}>
                <helix-text tone="muted" variant="label">
                  {group.heading}
                </helix-text>
                {group.items.map((item) => (
                  <Link className={styles.siteFooterLink} href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </footer>
    </>
  )
}
