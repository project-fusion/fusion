import Link from 'next/link'
import { FusionMark } from '@/components/fusion-mark/fusion-mark'
import { PRODUCTS } from '@/content/products/products'
import styles from './site-footer.module.css'

/**
 * What the footer links, in three groups.
 */
const FOOTER_GROUPS = [
  {
    heading: 'Products',
    items: PRODUCTS.map((product) => ({ href: product.href, label: product.name })),
  },
  {
    heading: 'Company',
    items: [
      { href: '/company/services', label: 'Services' },
      { href: '/insights', label: 'Insights' },
      { href: '/company/thesis', label: 'Thesis' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { href: '/legal/terms', label: 'Terms of use' },
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/acceptable-use', label: 'Acceptable use' },
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

/**
 * The site's footer: the mark and where to find us, beside the whole site in
 * three columns.
 *
 * It runs the full width of the viewport and is inset by `space-2xl` rather
 * than by the page's own `--site-inset`, so the copyright starts on the same
 * line down the left edge as the wordmark in the header. That clamp opens to
 * seven rem on a wide screen, which is right for a column of prose and wrong
 * for chrome.
 */
export function SiteFooter() {
  return (
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
          <FusionMark label="Fusion" size="1.25rem" />
          {/* **The name leads and the line under it recedes.** Not `caption`
              for the name and `label` for the tagline: `label` is the
              small-and-firm variant meant for a field's name, 500 against a
              caption's 400 and one pixel smaller, so that pairing reads as the
              company being the caption of its own slogan. */}
          <helix-text variant="body-strong">Fusion Development Group</helix-text>
          <helix-text emphasis="subtle" variant="caption">
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
              <helix-text emphasis="muted" variant="label">
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
  )
}
