import type { Stage } from './verticals'

/**
 * A place inside a product worth putting in the masthead.
 *
 * Only destinations that exist. A panel is the one surface where a link to
 * nothing is indistinguishable from a link to something, because the reader
 * committed to the click before they could see what was behind it.
 */
export interface Destination {
  /**
   * Where it goes.
   */
  href: string
  /**
   * The sentence under the name, which is what the panel is for.
   */
  summary: string
  /**
   * The name on the row.
   */
  title: string
}

/**
 * A product: the evocative half of the naming rule.
 *
 * Two of them, and there will not be many. `CLAUDE.md` reserves an evocative
 * name for a module carrying a differentiated idea, so this list grows only
 * when something earns one, and everything else stays descriptive and stays
 * out of here.
 */
export interface Product {
  /**
   * The paragraph the landing page gives it.
   *
   * Separate from `summary` because the two are read at different distances: a
   * row in a panel gets one line and a card on the landing page gets an
   * argument. Both live here so neither can drift into contradicting the other.
   */
  body: string
  /**
   * What a reader can actually open inside it, and nothing they cannot.
   */
  destinations: Destination[]
  /**
   * Its page, which is also its vertical's page where the two collapse.
   */
  href: string
  /**
   * How a reader takes it, as the command they would run.
   *
   * Absent where there is nothing to install, which is the honest state for
   * anything still `Building` with no package behind it. The landing page says
   * so in words rather than showing an empty box, so a reader learns what is
   * ready by reading the same field either way.
   */
  install?: string
  /**
   * The license the package ships under, for the reader who is deciding whether
   * they may use it rather than whether to buy anything. Beside `install`,
   * because the two questions arrive together and neither is answered by prose
   * further down the page.
   */
  license?: string
  /**
   * The product's own mark, from `helix/icons`.
   *
   * One mark per column and none on the rows beneath it. Rows carried Phosphor
   * glyphs before, and three instruments stacked under a fourth mark read as a
   * panel of icons rather than a panel of destinations: the marks stopped
   * meaning anything the moment everything had one. The base layer already
   * expects this, and its row grid keeps the mark's column at `auto`, so a row
   * with nothing in it starts where the heading does.
   *
   * These are the first bespoke product marks to ship. `adcce07c` removed three
   * earlier attempts because each was a pictogram of the product's metaphor
   * standing beside a parent that is a geometric monogram. These are monograms
   * in the parent's construction: one rounded body with material removed, two
   * notches for Helix and one slot for Cortex.
   *
   * **A tile, and the letter is painted rather than cut out.** A mask would
   * make it a real hole, which is the same thing only while the mark sits on
   * white: anywhere else the hole takes the ground behind it, and a letter on a
   * coloured field has to stay light on every ground it lands on.
   *
   * **The drawing carries no colour decision.** The tile is a gradient between
   * `--logo-color-from` and `--logo-color-to` and the letter is
   * `--logo-color-knockout`, each falling back to what the wordmark uses, which
   * is why the panel can render these as a dark tile with a near-white letter
   * without a second asset: `site.css` sets the three hooks and the drawing
   * never moves. A monotone variant taking `currentColor` was built first and
   * is the wrong shape of solution, because it answers in the drawing a
   * question the hooks already answer in the stylesheet.
   *
   * The tile carries its own padding, so its letter is 58% of its box, which is
   * why `site.css` sizes it `icon-md` where the base layer says `icon-sm`: a
   * bare glyph fills its own box and this does not.
   */
  mark: string
  /**
   * The evocative name, which is what the masthead says.
   */
  name: string
  /**
   * Its one-word job, worn as the column's subtitle. `The DNA`, `The mind`.
   */
  role: string
  /**
   * What is true of it today, carried into the panel rather than left at the
   * door. A megamenu is the first thing a reader sees, so it is the first
   * place the stage has to be legible.
   */
  stage: Stage
  /**
   * One line, for the panel's column head and the landing page's card.
   */
  summary: string
}

/**
 * The two substrates, which are the only two products.
 *
 * **The masthead says `Products` and lists these, not the verticals.** A
 * vertical is a division and a product is a thing you use: nobody uses Fusion
 * Design, they use Helix. The verticals still ride in the panel's third
 * column, because dropping Energy and Capital from the map to keep the column
 * count tidy would be softening them by omission, which is the one thing the
 * stage labels exist to prevent.
 *
 * Cortex carries one destination and Helix carries four, and the asymmetry is
 * the honest reporting rather than a gap to fill. Engram, Trace and Recall are
 * named in `CLAUDE.md` and none of them is built, so none of them is a row
 * here. The day one is, it is a row.
 */
export const PRODUCTS: Product[] = [
  {
    body: 'The design system. Web components with a token layer that derives an accessible palette from one brand color, so an interface is consistent because there was nothing else to choose. Components ship as custom elements, which keeps the framework above them a choice rather than a commitment.',
    destinations: [
      /* First, because the panel is where a reader arrives rather than returns.
         What a new one needs is how to install it and the vocabulary the
         component pages already assume.

         **`/helix/docs`, not `/helix/docs/introduction`.** That route derives
         the first page of the first section rather than naming one, so a deep
         link here would hardcode the single thing it exists to compute, and the
         masthead would be the last place still pointing at the old front page
         the day the order changes.

         **`Docs` rather than `Guides`.** It was `Guides` while the docs sidebar
         had no Components section and the destination reached only the prose
         half. The sidebar carries both now, so the name can be the true one.

         **Components keeps a row of its own, beside it rather than inside it.**
         It was removed when the sidebar learned to carry both, on the reasoning
         that one navigation should be one destination. That is a fact about the
         sidebar and not about what a reader arrives wanting: an alphabetical
         list of every family is the single most asked-for thing here, and
         putting it one level down behind a word that does not say "components"
         makes a reader hunt for the thing they came for. A panel is for the
         destinations people want, not for a tidy model of the routes. */
      {
        href: '/helix/docs',
        summary: 'Install it, theme it, and the ideas underneath.',
        title: 'Docs',
      },
      {
        href: '/helix',
        summary: 'Every family, with its API and a live example.',
        title: 'Components',
      },
      {
        href: '/helix/sandbox',
        summary: 'Edit an example with the source beside it.',
        title: 'Sandbox',
      },
      {
        href: '/helix/theme',
        summary: 'Derive a palette and see every pair measured.',
        title: 'Theme builder',
      },
    ],
    href: '/helix',
    install: 'bun add @helix-io/web',
    license: 'MIT',
    mark: 'helix',
    name: 'Helix',
    role: 'The DNA',
    stage: 'Building',
    summary:
      'The design system. Web components over a token layer that derives its palette from one brand color.',
  },
  {
    body: 'Memory and provenance. What a system knows, where it learned it, and how much of it to trust. Not a model wrapper: the part that remains true when the model underneath is replaced.',
    destinations: [
      {
        href: '/cortex',
        summary: 'What a system knows, and how far to trust it.',
        title: 'Overview',
      },
    ],
    href: '/cortex',
    mark: 'cortex',
    name: 'Cortex',
    role: 'The mind',
    stage: 'Building',
    summary:
      'Memory and provenance. The part that stays true when the model underneath is replaced.',
  },
]
