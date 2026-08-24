import { ComponentArt } from '@helix-io/gallery'
import Link from 'next/link'
import { type Family, getFamilies } from '../../../../content/catalog/catalog'
import { PRODUCTS } from '../../../products'
import { findVertical, stageAppearance } from '../../../verticals'
import { ComponentBrowser } from './component-browser'
import styles from './gallery.module.css'

const vertical = findVertical('/helix')
const product = PRODUCTS.find((entry) => entry.href === '/helix')

/* `Components`, because this is the index and no longer the product page.
   `/helix` was both at once and every awkward route below it was downstream of
   that: the masthead's Components row pointed at a page titled Helix, and
   `/helix/components` existed only as a `[family]` segment with no index above
   it, which is the one URL a reader would guess. See 189. */
export const metadata = { title: 'Components' }

/*
 * Every family Helix ships, and both surfaces for each.
 *
 * The API says what a component can do and the sandbox says what it looks like.
 * The eyebrow is still the vertical, so a reader arriving here from anywhere
 * knows which part of the company this belongs to.
 */
/**
 * How the grid may be ordered, and what each one compares.
 *
 * Every family reports `@since 0.1.0` today, so `newest` puts all sixty-five in
 * one tie and the name is what actually decides. It is here because it starts
 * working the day a second version exists, and because a tie-break by name is a
 * defined order rather than whatever the manifest happened to emit.
 */
const SORTS: Record<string, (a: Family, b: Family) => number> = {
  category: (a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
  name: (a, b) => a.label.localeCompare(b.label),
  newest: (a, b) =>
    b.since.localeCompare(a.since, undefined, { numeric: true }) || a.label.localeCompare(b.label),
}

/**
 * Sorting is a URL parameter and the server does it. Searching and filtering
 * are not, and the client does those.
 *
 * The split is not arbitrary. Filtering hides cards, which CSS can do without
 * touching the DOM, so the order a keyboard walks and the order a reader sees
 * stay the same thing. Sorting *reorders*, and the obvious client-side trick,
 * `order` on the grid items, moves only the paint: focus order and the reading
 * order of the accessibility tree would still follow the DOM, so a reader
 * tabbing through a grid sorted Z to A would visit it A to Z. That is a
 * 2.4.3 failure introduced for a convenience.
 *
 * Reordering on the server sidesteps it entirely: the markup arrives in the
 * order it is shown. It costs a navigation per sort, which is an RSC round trip
 * and is what makes the choice shareable in a link as well.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; status?: string }>
}) {
  if (!vertical) {
    return null
  }

  const { category, q, sort, status } = await searchParams
  const order = sort && sort in SORTS ? sort : 'name'
  const families = [...getFamilies()].sort(SORTS[order])

  const index = families.map((family) => ({
    aliases: family.aliases,
    category: family.category,
    label: family.label,
    slug: family.slug,
    status: family.status,
    summary: family.summary,
  }))

  return (
    <ComponentBrowser
      eyebrow={product?.name ?? vertical.name}
      index={index}
      /* Seeded from the URL on the server, so a shared link arrives already
         filtered rather than rendering all sixty-five and hiding most of them a
         frame later. */
      initialCategory={category ?? ''}
      initialQuery={q ?? ''}
      initialStatus={status ?? ''}
      /* The hero's own copy, not the vertical's.
       *
       * `vertical.name` and `vertical.summary` are shared data: the masthead,
       * the landing page and the metadata title all read them, so repurposing
       * either to say something about Helix would change four places to fix
       * one. The eyebrow names the vertical, and the heading and the line under
       * it are this page's, written for the front of a gallery. */
      lede="The DNA every Fusion interface is built from, and yours to build on."
      order={order}
      sorts={Object.keys(SORTS)}
      stage={vertical.stage}
      stageTone={stageAppearance(vertical.stage)}
      title="Components"
    >
      <helix-grid className={styles.familyGrid} columns={5} gap="2xl">
        {families.map((family) => (
          <Link
            aria-label={family.label}
            className={styles.familyCard}
            data-card
            data-slug={family.slug}
            href={`/helix/components/${family.slug}`}
            key={family.slug}
          >
            <helix-card separation="outlined">
              <ComponentArt slug={family.slug} />
              <helix-flex align="center" gap="sm" justify="between" slot="header">
                <helix-text as="h3" variant="title">
                  {family.label}
                </helix-text>
                {/* A mark rather than a word. Every component in this list is
                      experimental, so a tag on each of them is a column of
                      identical yellow labels that says nothing by being
                      everywhere, and it competes with the name it sits beside.
                      The icon carries its own accessible name, so a reader who
                      cannot see it is told the same thing a pointer user gets
                      from the tooltip. Same mark and same words as the
                      sandbox's own tree. */}
                {family.status === 'experimental' && (
                  <helix-tooltip content="Experimental. The API can change." placement="top">
                    {/* Neutral. Warning read as a fault rather than a stage,
                          and the tooltip is what says which stage it is. A card
                          in a list of fifty-four experimental components is not
                          reporting a problem. */}
                    <helix-tag className={styles.statusMark}>
                      <helix-icon label="Experimental" name="flask"></helix-icon>
                    </helix-tag>
                  </helix-tooltip>
                )}
              </helix-flex>
              <helix-text tone="muted" variant="caption">
                {family.summary}
              </helix-text>
            </helix-card>
          </Link>
        ))}
      </helix-grid>
    </ComponentBrowser>
  )
}
