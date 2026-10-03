import type { Stage } from '@/content/verticals/verticals'

/**
 * A place inside a product worth putting in the masthead.
 *
 * Only destinations that exist. A panel is the one surface where a link to
 * nothing is indistinguishable from a link to something, because the reader
 * committed to the click before they could see what was behind it.
 */
export interface Destination {
  /**
   * Where it goes, and absent while it has nowhere to go yet: a row without
   * one is not a link, whatever its stage.
   */
  href?: string
  /**
   * The sentence under the name, which is what the panel is for.
   */
  summary: string
  /**
   * The stage it is at, where it is named and not yet finished.
   *
   * **The stage says where the work stands; the `href` says whether there is
   * anywhere to go**, and the two are separate. A row named before it exists
   * has a stage and no `href`, and does not pretend to be a link: nothing is
   * followed and it leaves the tab order, rather than being focusable and
   * inert. A row that is still being built and already has a page, as Maps
   * does, is a link that carries its stage. Naming the modules before they exist is the point,
   * since the division of the product is the argument; letting one be pressed
   * would be the part that lied.
   *
   * **The real stage, never a softer word standing in for it.** `AGENTS.md`
   * says never to soften these, and the Cortex page two clicks away reports
   * Engram and Trace as Building and Recall as Declared. A menu calling all
   * three the same thing disagrees with the page as well as with the rule.
   */
  stage?: 'Building' | 'Declared'
  /**
   * The name on the row.
   */
  title: string
}

/**
 * A product: the evocative half of the naming rule.
 *
 * Two of them, and there will not be many. `AGENTS.md` reserves an evocative
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
   * One mark per column and none on the rows beneath it: three glyphs stacked
   * under a fourth mark read as a panel of icons rather than a panel of
   * destinations, and a mark on everything means nothing. The base layer already
   * expects this, and its row grid keeps the mark's column at `auto`, so a row
   * with nothing in it starts where the heading does.
   *
   * Monograms in the parent's construction: one rounded body with material
   * removed, two notches for Helix and one slot for Cortex. A pictogram of the
   * product's metaphor is the shape to avoid, since the parent it stands beside
   * is a geometric monogram.
   *
   * **A tile, and the letter is painted rather than cut out.** A mask would
   * make it a real hole, which is the same thing only while the mark sits on
   * white: anywhere else the hole takes the ground behind it, and a letter on a
   * colored field has to stay light on every ground it lands on.
   *
   * **The drawing carries no color decision.** The tile is a gradient between
   * `--logo-color-from` and `--logo-color-to` and the letter is
   * `--logo-color-knockout`, each falling back to what the wordmark uses, which
   * is why the panel can render these as a near-black tile on a light ground
   * and a near-white one on a dark ground without a second asset: `site.css`
   * sets the three hooks and the drawing never moves. A monotone variant taking
   * `currentColor` is the wrong shape of solution, because it answers in the
   * drawing a question the hooks already answer in the stylesheet.
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
 * column, so a reader who wants the shape of the company gets it one click
 * away rather than from a menu that promised products and handed over
 * divisions.
 *
 * Engram, Trace and Recall are rows carrying their stage rather than a link,
 * because the division of Cortex is the argument even before the modules are
 * built. A row gains an `href` on the day it has somewhere to go, and keeps its
 * stage until it is finished: Maps is both.
 */
export const PRODUCTS: Product[] = [
  {
    body: 'A design system of web components. Helix computes a full color palette from your brand color, and every component uses the same tokens, so your interface stays consistent.',
    destinations: [
      /* First, because the panel is where a reader arrives rather than returns.
         What a new one needs is how to install it and the vocabulary the
         component pages already assume.

         **`/helix/docs`, not `/helix/docs/introduction`.** That route derives
         the first page of the first section rather than naming one, so a deep
         link here would hardcode the single thing it exists to compute, and the
         masthead would be the last place still pointing at the old front page
         the day the order changes.

         **Components keeps a row of its own, beside Docs rather than inside
         it.** The docs sidebar carries both, but that is a fact about the
         sidebar and not about what a reader arrives wanting: an alphabetical
         list of every family is the single most asked-for thing here, and
         putting it one level down behind a word that does not say "components"
         makes a reader hunt for the thing they came for. A panel is for the
         destinations people want, not for a tidy model of the routes. */
      {
        href: '/helix/docs',
        summary: 'Install Helix, build a theme, and learn how it works.',
        title: 'Docs',
      },
      {
        href: '/helix/components',
        summary: 'Every component, with its API and a live example.',
        title: 'Components',
      },
      {
        href: '/helix/sandbox',
        summary: 'Edit an example and see the result beside the code.',
        title: 'Sandbox',
      },
      {
        href: '/helix/theme',
        summary: 'Build a palette from your brand color and check its contrast.',
        title: 'Theme builder',
      },
      /* A part of Helix rather than a third product: its argument is Helix's,
         a map in the page's theme that a screen reader can find, and without
         Helix it is MapLibre and somebody's tiles. Last, because the four
         above are how Helix is used and this is a thing built with it. */
      {
        href: '/helix/maps',
        stage: 'Building',
        summary: 'Interactive maps in your brand’s colors.',
        title: 'Maps',
      },
      /* Beside Maps, for Maps' reason: its argument is Helix's, a graph in
         the page's theme with a list of every note beside it, and without
         Helix it is Sigma.js, cosmos.gl, or three.js and somebody's data. */
      {
        href: '/helix/graph',
        stage: 'Building',
        summary: 'Interactive graphs in your brand’s colors, in 2D and 3D.',
        title: 'Graph',
      },
    ],
    href: '/helix',
    install: 'bun add @fusion.dev/helix',
    license: 'MIT',
    mark: 'helix',
    name: 'Helix',
    role: 'The DNA',
    stage: 'Building',
    summary: 'A design system of web components, themed from your brand color.',
  },
  {
    body: 'A memory and provenance layer for AI systems. Cortex records what a system knows, where each fact came from, and how far to trust it. The record stays when you replace the model.',
    /* The three modules that have earned an evocative name, per `AGENTS.md`:
       inside Cortex that is exactly Engram, Trace and Recall, and the rest stay
       descriptive. They are named here before they are built because the
       division of the thing is what Cortex *is*, and a panel showing only what
       already ships describes a smaller idea than the one on offer. */
    destinations: [
      {
        href: '/cortex',
        summary: 'What a system knows, and how far to trust it.',
        title: 'Docs',
      },
      {
        stage: 'Building',
        summary: 'Memory: what a system keeps, and for how long.',
        title: 'Engram',
      },
      {
        stage: 'Building',
        summary: 'Provenance: where each fact came from.',
        title: 'Trace',
      },
      {
        stage: 'Declared',
        summary: 'Context: what to give a model, and why.',
        title: 'Recall',
      },
    ],
    href: '/cortex',
    mark: 'cortex',
    name: 'Cortex',
    role: 'The mind',
    stage: 'Building',
    summary: 'Memory and provenance for AI systems, kept when you change models.',
  },
]
