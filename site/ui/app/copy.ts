/**
 * The shape a page's words take when they are data rather than markup.
 *
 * **This is the one place the AI-native plan argues against its own general
 * rule, and the reasoning is worth keeping here** because it is what this
 * module is instead of. Every other content surface in the repository is MDX
 * with a typed registry. The landing page is not prose with headings: it is
 * bands, a statement, a table read from `verticals.ts`, and a grid of cards.
 * Expressing that in MDX means inventing `<Statement>`, `<Verticals />` and
 * `<Questions>`, and then every one of those needs two renderers, one to Helix
 * markup and one to markdown, or its `.md` has a hole in it where the component
 * was.
 *
 * That protocol is real work, it is the most fragile idea in that document, and
 * it would be built for a total of zero existing components: the docs MDX has
 * no live JSX in it at all. Moving this page into MDX is the only thing that
 * would create the problem the protocol solves.
 *
 * So the layout stays in TSX and the words move here, which is the pattern
 * `verticals.ts` already is and already feeds several consumers. A page renders
 * it as Helix markup; `bun run catalog` renders the same object as markdown.
 * Single source, no component protocol, no new machinery.
 *
 * **The rule that survives is narrower and still holds**: a component may not
 * appear in content that has a `.md` unless it has a markdown renderer. It
 * governs the docs packages if they ever gain live JSX. It does not need to
 * govern a page that is a layout over data.
 */

/** A named thing with a paragraph under it: a card, a row, a reason. */
export interface CopyItem {
  body: string
  name: string
}

/** One band of a page. */
export interface CopyBlock {
  /** Paragraphs under the heading. */
  body?: string[]
  /**
   * Where the block's cards come from, when they are not written here.
   *
   * A name rather than the data, because the data already has a home:
   * `verticals.ts`, `products.ts` and `services.ts` each feed several
   * consumers, and copying their contents into a second module would be the
   * duplication this whole arrangement exists to remove. The renderers resolve
   * it; this only says which list.
   */
  from?: 'insights' | 'products' | 'services' | 'verticals'
  /** Cards written here, for a block whose items belong to it alone. */
  items?: CopyItem[]
  /** The small line above the heading. */
  kicker?: string
  /** The heading. Absent where the section reads without one. */
  title?: string
}

/**
 * A page's words, in the order they are read.
 *
 * `title` and `lede` are the hero. Everything else is a band.
 */
export interface PageCopy {
  blocks: CopyBlock[]
  /** The sentence under the title. */
  lede: string
  /**
   * Where the words came from, for the document's frontmatter.
   *
   * Stated per page rather than assumed, because it is not the same answer
   * everywhere and a document that claims the wrong one is worse than a
   * document that claims nothing. Most of these are rendered by their page as
   * well; the tool pages are not, and say so.
   */
  source?: string
  /** The `h1`, and the page's name in the route registry. */
  title: string
}
