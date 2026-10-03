/**
 * The themed page's own stylesheet, as a string, because it has to travel.
 *
 * `ThemedPage` renders inside `helix-sandbox-preview`, which is a sandboxed
 * document with an opaque origin: it cannot fetch the site's stylesheet, and the
 * site's stylesheet could not reach into it if it did. So the page's layout goes
 * the same way its markup does, in the render message, and lands in a `<style>`
 * the frame owns.
 *
 * **This is why the split is by name.** `.theme*` is the tool around the preview
 * and stays in `site.css`; `.themed*` is the page being previewed and lives
 * here. Send the palette without this and the page arrives with correct tokens
 * and no layout at all: the figures stack one per line instead of running as a
 * row, and the wordmark, an inline `<svg>` carrying no `width` or `height` of
 * its own, renders at 0x0.
 *
 * **Not `themed-page.css.ts`**, which is what it wanted to be called: `*.css.ts`
 * is the name `turbo run styles` generates into and `.gitignore` excludes it
 * repo-wide, so that file would have worked on this machine and existed nowhere
 * else.
 */

/**
 * Identity tag, for the editor and for `helix component`'s `tokens`.
 *
 * The check reads `` css` ` `` templates out of `.ts` files exactly as it reads
 * whole `.css` files, so the tokens named here are held to the same rule as the
 * ones in `site.css`: no raw values where a token exists, no primitives, and
 * nothing referring to a token that does not exist.
 */
const css = (strings: TemplateStringsArray): string => strings.raw.join('')

export const THEMED_PAGE_STYLES = css`
  /* **The preview paints its own page**, and nothing here has to arrange it: the
     frame is a document, so the base layer's own \`body\` rule sets the ground,
     the ink, the face, the height and the scroller from the same tokens the
     theme has just redefined. */

  /* **A container, because the pane is not the window.** Everything inside
     answers to how wide the reader dragged the separator, and a media query
     would answer to the browser instead: at a 24 per cent form and a split
     artifact pane, the preview is a third of the screen while
     \`(width < 48rem)\` is still false.

     On \`body\` rather than the root, because \`#preview-root\` is where the markup
     lands and a container has to be an ancestor of what queries it. */
  body {
    container-type: inline-size;
  }

  /* A page's own rhythm: sections stacked with air between them, and each one
     insetting its own content rather than the page insetting everything. Bands
     that paint a ground have to run edge to edge, which they cannot do if the
     inset is on the container above them. */
  /* **Margins rather than \`gap\`, so the rhythm has an exception.** A flex gap
     is applied between every pair and cannot be waived for one of them, and
     there is one that has to be: the closing band paints a ground and the
     footer under it is the same piece of page furniture, so air between them
     reads as a mistake rather than as rhythm. That is expressible as
     \`.themedClose + .themedFooter\` and is not expressible at all with a gap.

     **And no padding at the end.** The footer's own inset ends the page. A
     \`padding-block-end\` on top of it left a band of ground below the last line
     that belonged to nothing. */
  .themedPage {
    display: flex;
    flex-direction: column;
  }

  .themedPage > * + * {
    margin-block-start: var(--helix-space-2xl);
  }

  /* The band and the footer are continuous: no air between them, and no rule
     either, the band's own edge already being the line. */
  .themedClose + .themedFooter {
    border-block-start: none;
    margin-block-start: 0;
  }

  /* **Headings balance their lines; body text does not.** Three feature titles
     in a narrow column each broke where the words ran out rather than where
     they read, and "Yours to take with you" left "you" alone on a line. The
     browser can divide a heading evenly and this asks it to. It is deliberately
     not on body copy: \`balance\` is capped at a handful of lines and is a rule
     about titles, and a paragraph that reflows to even lengths reads as
     justified text rather than as prose.

     One rule for every layout, because a heading that wraps badly does it in
     all four and the fix is the same one. */
  helix-text[variant="display"],
  helix-text[variant="subheading"] {
    text-wrap: balance;
  }

  /* Full bleed inside the preview, the way a real page's header is. */
  .themedHeader {
    --app-header-max-inline-size: none;
  }

  /* The mark. One shape, one fill, and the fill is the whole point: it is the
     brand at the 3:1 a graphic owes, where every other use of the brand on the
     page has been solved for a word. */
  .themedMark {
    block-size: var(--helix-size-icon-md);
    /* \`color\`, not a fill: the bands take \`currentColor\`, so one definition
       serves the header and the footer and inherits wherever else it is put. */
    color: var(--helix-color-brand-mark);
    display: block;
    flex: 0 0 auto;
    inline-size: var(--helix-size-icon-md);
  }

  /* **A progress bar has no length of its own, and a flex item is given none.**
     The component is a block whose track is \`inline-size: 100%\`, which fills a
     container in normal flow and collapses to zero as a flex item: measured, the
     host was 0 by 8 and the bar was invisible on the marketing page and in the
     workspace, in every context, since the day it was written. The caption
     beside it read as a sentence with nothing to explain.

     It publishes \`--progress-size\` for its thickness and nothing for its length,
     which is right: how long a bar is, is a fact about the row it sits in. So
     the row says it. */
  helix-progress {
    inline-size: 6rem;
  }

  /* Scoped by a class rather than by descent, because the hero also holds a
     button with an icon in it and that one is the button's to size. */
  .themedAssurance helix-icon {
    --icon-size: 1.15em;
    color: var(--helix-color-primary);
  }

  .themedHero {
    max-inline-size: 46rem;
    padding-inline: var(--helix-space-2xl);
    padding-block-start: var(--helix-space-lg);
  }

  /* The recessed band, so \`surface-sunken\` is on screen beside the others rather
     than being the one ground nobody looks at. Edge to edge, because a band that
     insets is a card. */
  /* **A grid rather than a flex row, because four figures have to divide the
     band.** Flexed, they took their own widths and bunched at the start:
     measured at 1232, the four occupied 566 and left 618 of empty ground to
     their right, which reads as a row that failed to load rather than as proof.
     Equal columns make the band a measured thing, and they hold whether a
     figure is \`31\` or \`98.6%\`. */
  .themedFigures {
    background-color: var(--helix-color-surface-sunken);
    border-block: var(--helix-border-surface) solid var(--helix-color-border);
    box-shadow: var(--helix-shadow-surface);
    display: grid;
    gap: var(--helix-space-lg);
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: var(--helix-space-lg) var(--helix-space-2xl);
  }

  .themedFeatures,
  .themedChart,
  .themedSplit {
    padding-inline: var(--helix-space-2xl);
  }

  /* **Taller than the component's own default, because this one is full
     width.** \`--bar-chart-block-size\` rests at 12em, which is right for a card
     in a column and wrong for a card spanning the measure: measured at 1102
     wide the drawing came out 190 tall, a ratio near six to one, and the band
     read as an empty card with a heading on it. The hook exists for exactly
     this, so nothing here reaches past what the component publishes. */
  .themedChart helix-bar-chart {
    --bar-chart-block-size: 19em;
  }

  .themedSplit {
    display: grid;
    gap: var(--helix-space-md);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* The icon carries the brand rather than the ink, so a feature row reads as
     part of the palette rather than as three more paragraphs. */
  .themedFeatureIcon {
    color: var(--helix-color-primary);
    --icon-size: var(--helix-size-icon-lg);
  }

  /* The one large area of \`primary-surface\` on the page, which makes it the one
     place \`foreground-on-accent\` is doing real work rather than sitting on a
     button the size of a word. */
  .themedClose {
    background-color: var(--helix-color-primary-surface);
    color: var(--helix-color-foreground-on-accent);
    padding: var(--helix-space-xl) var(--helix-space-2xl);
  }

  /* **The call to action inverts on the band.** A solid neutral button on a
     brand fill comes out near-black, which has contrast and reads as
     unconsidered: on a colored band the emphatic thing is the pale one. Through
     the two hooks Button publishes for it rather than a rule of ours reaching
     into the component, and it borrows the same pair the band already uses, so
     the button cannot disagree with the text beside it about what is legible
     here. */
  .themedClose helix-button {
    --button-background-color: var(--helix-color-foreground-on-accent);
    --button-foreground-color: var(--helix-color-primary-surface);
  }

  .themedFooter {
    border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
    padding: var(--helix-space-lg) var(--helix-space-2xl);
  }

  /* ---------------------------------------------------------------------- *
     The minimal layout: a column with room in it.

     **Narrower than the marketing page on purpose.** The measure is the hero's,
     and everything below it takes the same one, so three short paragraphs read
     as three related things rather than as a row so wide nothing belongs to
     anything. A landing page with four items on it is a column, not a layout.
   * ---------------------------------------------------------------------- */
  /* **One measure, and everything on the page starts on it.** Measured at 1280
     before this: the header's brand sat at 76, the footer's at 100 and every
     paragraph at 272, so a page with four things on it had three left edges.
     The header and the footer paint full-bleed grounds and their *contents* do
     not, which is the distinction the hooks exist for: \`--app-header-padding\` and
     \`--app-header-max-inline-size\` are published for precisely this, so nothing
     here reaches inside a shadow root to say it. */
  .themedMinimal {
    --themed-measure: 52rem;

    display: flex;
    flex-direction: column;
    gap: var(--helix-space-2xl);
  }

  .themedMinimal .themedHeader {
    --app-header-padding: var(--helix-space-2xl);
    --app-header-max-inline-size: var(--themed-measure);
  }

  /* The rule stays full width and the content does not, so the footer still
     ends the page across its whole width while its words start where every
     other word on the page starts. */
  .themedMinimal .themedFooter {
    padding-inline: 0;
  }

  .themedMinimal .themedFooter > helix-flex {
    margin-inline: auto;
    max-inline-size: var(--themed-measure);
    padding-inline: var(--helix-space-2xl);
  }

  .themedMinimalHero,
  .themedMinimalFeatures {
    margin-inline: auto;
    max-inline-size: var(--themed-measure);
    padding-inline: var(--helix-space-2xl);
    inline-size: 100%;
  }

  .themedMinimalHero {
    padding-block-start: var(--helix-space-2xl);
  }

  /* Three columns of prose, and the ink sits straight on the page ground: no
     card, no border, no second surface between the reader and the words. That
     puts \`foreground-muted\` against \`background\` on screen, which is a pair
     the marketing page never shows because every feature there is in a card. */
  .themedMinimalFeatures {
    display: grid;
    gap: var(--helix-space-xl);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  /* ---------------------------------------------------------------------- *
     The workspace layout: a rail and the work.

     **Three grounds sharing edges**, which no other layout does. The rail is
     sunken, the page is the background and the cards are the surface, all
     touching rather than separated by whitespace, which is the harder test of
     whether a palette separates them.
   * ---------------------------------------------------------------------- */
  .themedApp {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    min-block-size: 100dvh;
  }

  /* **The edge is the theme's to decide, not this page's.**

     Never \`--helix-border-thin\` here: it is a width and always one pixel, so the
     rail draws a line whatever the reader chose, and picking \`fill\` or \`space\`
     moves every card on the page and leaves the rail exactly as it was. That is
     the preview disagreeing with the artifact beside it about what the theme
     says.

     \`--helix-border-surface\` and \`--helix-shadow-surface\` are what the engine
     emits for \`separation.surface\`, and \`Card\` reads exactly this pair. A rail
     is a surface with a ground of its own, so it answers to the same question a
     card does.

     **A divider is not a surface**, which is where this stops. The footer's rule
     and the colophon's keep \`--helix-border-thin\`, because they separate two
     things sharing one ground rather than marking where a ground changes, and
     that is what \`helix-list[divided]\` uses for the same reason. */
  .themedAppRail {
    background-color: var(--helix-color-surface-sunken);
    border-inline-end: var(--helix-border-surface) solid var(--helix-color-border);
    box-shadow: var(--helix-shadow-surface);
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-lg);
    inline-size: 14rem;
    padding: var(--helix-space-lg);
  }

  /* Stacked, and stretched, so a destination is a row in the rail rather than a
     word floating in it. The base layer's \`data-navigation-item\` helper does
     the rest: this only decides the axis. */
  .themedAppNav {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-2xs);
  }

  /* **The helper centers, because a nav bar item should.** \`data-navigation-item\`
     is \`display: flex; justify-content: center\`, which is right for a row and
     wrong for a column: stacked, it put three destinations down the middle of
     the rail with a ragged left edge. Both rules are document rules here, so
     specificity decides and \`.themedAppNav a\` is one class heavier than the
     bare attribute. The axis is the only thing taken; everything else about how
     a destination looks stays the base layer's. */
  .themedAppNav a {
    justify-content: start;
  }

  /* Pushed to the bottom, which is where a signed-in person sits in every
     application anybody has used. */
  .themedAppUser {
    margin-block-start: auto;
  }

  .themedAppMain {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-lg);
    min-inline-size: 0;
    padding: var(--helix-space-lg);
  }

  .themedAppStats {
    display: grid;
    gap: var(--helix-space-md);
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .themedAppGrid {
    display: grid;
    gap: var(--helix-space-md);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* ---------------------------------------------------------------------- *
     The editorial layout: a label in the margin and a measure beside it.

     **The structure is visible without a box being drawn**, which is the whole
     idea and the reason this cannot be built out of the other layouts' parts. A
     card says "these things belong together" by enclosing them; a rail says it
     by aligning them, and a palette that can only separate things by drawing
     borders around them fails here and nowhere else in this tool.
   * ---------------------------------------------------------------------- */
  .themedEditorial {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-3xl);
    padding-block: var(--helix-space-2xl);
  }

  .themedEditorialMain {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-3xl);
  }

  /* One grid, used by every row including the masthead and the colophon, so the
     nav, every paragraph and the contact line all start on one vertical. */
  /* **\`baseline\`, rather than nudging the label down by a fraction of an em.**
     A \`padding-block-start\` on the label lines up at one type scale and stops
     lining up the moment a reader moves the body size or picks a face with a
     different x-height, both of which this tool can do. Grid baseline alignment
     asks the browser to do it instead. */
  .themedRail {
    align-items: baseline;
    column-gap: var(--helix-space-xl);
    display: grid;
    grid-template-columns: 7rem minmax(0, 34rem);
    justify-content: center;
    padding-inline: var(--helix-space-lg);
  }

  /* **Mono, small, subtle, and set against the page rather than a card.** It is
     the only mono on any preview, which is what gives the Mono face control
     something to move, and the only place \`foreground-subtle\` carries text with
     nothing else holding it up. */
  .themedRailLabel {
    color: var(--helix-color-foreground-subtle);
    font-family: var(--helix-font-mono);
    font-size: var(--helix-text-xs);
    line-height: var(--helix-leading-normal);
    text-align: end;
  }

  /* **The masthead centers where the prose rows sit on a baseline.**
     \`.themedRail\` aligns to the first baseline, which is exactly right for a
     label in a margin beside a paragraph and wrong for a bar: measured, the mark
     and the wordmark sat six pixels above the line the destinations are set on,
     because a baseline is a fact about text and a bar is two blocks of chrome
     that should share a center. The row overrides the axis and nothing else. */
  .themedMasthead {
    align-items: center;
  }

  /* The wordmark sits where a rail label would and is not one: right-aligned to
     the same edge, and otherwise in the page's own voice rather than the
     margin's. */
  .themedWordmark {
    align-items: center;
    display: flex;
    gap: var(--helix-space-2xs);
    justify-content: end;
  }

  /* **An arrow set to the text, not to the icon scale.** It rendered at 20px
     beside 14px text and sat six pixels above the line, on the baseline, which
     is where an atomic inline lands when nothing says otherwise: the glyph
     poked out of the line box and read as a separate object. One em and an
     optical center make it part of the word.

     \`inline-flex\` for the gap, so the space between the word and the arrow is a
     token rather than a text node whose width belongs to the font. */
  .themedMore {
    align-items: center;
    display: inline-flex;
    gap: var(--helix-space-2xs);
  }

  .themedMore helix-icon {
    --icon-size: 1em;
  }

  /* \`helix-text\` ships no margins: it sets a run of text and leaves how far it
     sits from the next one to whoever is composing. That is the right split,
     and this is the composing. */
  .themedMeasure > * + * {
    margin-block-start: var(--helix-space-md);
  }

  .themedMeasure > helix-list,
  .themedMeasure > helix-text {
    display: block;
  }

  /* **The rule follows the measure, not the window.** Full bleed it was the one
     thing on an otherwise narrow page that touched both edges, so a column of
     prose ended under a line three times its width. On this layout everything
     aligns to the measure or it is not part of the page, and a rule is not an
     exception to that. The rail stays clear, which is what the empty label cell
     in the markup is for. */
  .themedColophon > .themedMeasure {
    border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
    padding-block-start: var(--helix-space-xl);
  }

  /* **The map layout: a bar, and the map under it filling what is left.**
     The frame is the page's height, so the map takes the rest of it rather
     than a height of its own, which is what a product whose page is a map
     looks like. */
  .themedMapPage {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-block-size: 100dvh;
  }

  .themedMapBar {
    border-block-end: var(--helix-border-surface) solid var(--helix-color-border);
    box-shadow: var(--helix-shadow-surface);
    padding: var(--helix-space-sm) var(--helix-space-lg);
  }

  .themedMapStage {
    min-block-size: 0;
    position: relative;
  }

  /* Edge to edge, so no frame of its own: the page is the frame. */
  .themedMapFrame {
    --map-block-size: 100%;
  }

  .themedMapFrame::part(region) {
    border: 0;
    border-radius: 0;
  }

  .themedMapCanvas {
    block-size: 100%;
  }

  /* **A floating surface, so it answers to the floating separation.** The
     panel lies over the map the way a popover lies over a page, and a theme
     that separates what floats by a shadow, a border or a fill should be seen
     doing it here, over the busiest ground in the preview, rather than only
     over a flat one.

     **And glass, for the same reason**: the theme's translucency and blur,
     the pair \`Card\` takes for \`material="glass"\`, so the sliders for both
     are seen doing something over ground that shows it. */
  .themedMapPanel {
    backdrop-filter: var(--helix-material-backdrop);
    background-color: var(--helix-material-translucent);
    border: var(--helix-border-floating) solid var(--helix-color-border);
    border-radius: var(--helix-radii-md);
    box-shadow: var(--helix-shadow-floating);
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-md);
    inline-size: min(22rem, calc(100% - var(--helix-space-lg) * 2));
    inset-block-start: var(--helix-space-lg);
    inset-inline-start: var(--helix-space-lg);
    max-block-size: calc(100% - var(--helix-space-lg) * 2);
    overflow: auto;
    padding: var(--helix-space-lg);
    position: absolute;
  }

  @container (width < 52rem) {
    .themedSplit,
    .themedAppGrid {
      grid-template-columns: minmax(0, 1fr);
    }

    .themedAppStats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    /* The rail is the first thing to go, the same way the marketing header's
       nav is: what an application must keep at any width is the work, and a
       rail that has become two thirds of a narrow pane is no longer a rail. */
    .themedApp {
      grid-template-columns: minmax(0, 1fr);
    }

    .themedAppRail {
      display: none;
    }
  }

  /* The header's center and end collide before the page does: a nav is centered
     in the row, so it runs into the actions long before anything else runs out
     of room. The nav goes first, which is what a real page does at the same
     width and leaves the two things a header must keep, the name and the way
     in. */
  @container (width < 46rem) {
    .themedHeader .themedNav {
      display: none;
    }
  }

  /* The hero is set for a page, so it needs stepping down for a pane. */
  @container (width < 40rem) {
    /* The panel under the map rather than over it: at this width a panel
       over the map would cover most of it, and the map is what the page is.
       Stated as a height the map keeps, so the panel does not push it out of
       the frame. */
    .themedMapPage {
      grid-template-rows: auto auto auto;
    }

    .themedMapStage {
      display: contents;
    }

    .themedMapFrame {
      --map-block-size: 60dvh;
    }

    .themedMapPanel {
      border: 0;
      border-block-start: var(--helix-border-surface) solid var(--helix-color-border);
      border-radius: 0;
      box-shadow: none;
      inline-size: auto;
      max-block-size: none;
      position: static;
    }

    .themedHero,
    .themedFeatures,
    .themedChart,
    .themedSplit,
    .themedClose,
    .themedFooter {
      padding-inline: var(--helix-space-lg);
    }

    .themedFigures {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-inline: var(--helix-space-lg);
    }

    /* **Three feature cards do not become three narrower feature cards.**
       \`columns={3}\` is a fact about the wide arrangement and the element cannot
       know how much room it was given, which is the area rules' whole position
       on responsiveness: the consumer decides. Measured at 320, the three-up
       row left each card thirty pixels of content and every title and paragraph
       inside it was clipped, with nothing overflowing the page to give it away.

       \`--grid-columns\` is published for exactly this and wins over the
       attribute, so this says the narrow arrangement without the markup
       claiming to know a width. */
    .themedFeatures helix-grid {
      --grid-columns: minmax(0, 1fr);
    }
  }

  /* **A figure is set at display size and cannot be halved twice.** At 320 the
     two-column arrangement gave each card 104 pixels against content that
     wanted 124, 112 and 137, so three of the four clipped their own number:
     \`1,200\` came out as \`1,20\`. Nothing overflowed the page, which is why a
     scroll-width check passed it and only looking caught it. One column below
     this, for both the band and the dashboard, since the same figures are in
     both. */
  @container (width < 30rem) {
    .themedAppStats,
    .themedFigures {
      grid-template-columns: minmax(0, 1fr);
    }

    .themedMinimalHero,
    .themedMinimalFeatures {
      padding-inline: var(--helix-space-lg);
    }

    /* **Display type steps down, because a long word cannot.** Measured at 320,
       "commissions" set at \`--helix-text-3xl\` wanted 262 pixels in a 224 measure
       and ran out of the column: no amount of wrapping helps, the word being the
       thing that does not fit. Every real page reduces its largest type at phone
       width and this is that, one step down the same scale the theme is
       deriving, so it still moves when a reader moves the type scale.

       A document rule setting \`font-size\` beats the \`:host([variant="display"])\`
       rule inside the component, which is the ordering the area rules describe
       and here is the wanted one: sizing text for the space it was given is a
       consumer's decision, not a component's.

       \`break-word\` under it as the floor, for a word long enough to overflow
       even at this size. Ugly and better than gone. */
    helix-text[variant="display"] {
      font-size: var(--helix-text-2xl);
      overflow-wrap: break-word;
    }

    /* The rail folds above the measure rather than beside it, and stops being
       right-aligned when it is no longer a margin. A seven rem column next to a
       narrow measure is most of the pane. */
    .themedRail {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--helix-space-2xs);
    }

    .themedRailLabel {
      text-align: start;
    }

    /* One column, because three columns of prose at this width is three columns
       of one word. */
    .themedMinimalFeatures {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* ---------------------------------------------------------------------- *
     The local business layout: a services site's page.

     **The shape a pool builder's or a joiner's site has**: an announcement over
     everything, a hero on a picture with the one call to action and a rating
     under it, three prices, the steps, the questions, and where to find them.
   * ---------------------------------------------------------------------- */
  .themedLocal {
    --themed-measure: 64rem;

    display: flex;
    flex-direction: column;
  }

  /* On the brand fill, as an announcement is, unless the builder gives it a
     color of its own. */
  .themedLocalBar {
    background-color: var(--helix-color-primary-surface);
    color: var(--helix-color-foreground-on-accent);
    padding: var(--helix-space-xs) var(--helix-space-lg);
    text-align: center;
  }

  /* **A picture drawn from the theme**: the media ground, lit from above by the
     brand, which is what a photograph under a caption is to the tokens. Its
     words take the media ink, the pair the theme measures for exactly this. */
  .themedLocalHero {
    background-color: var(--helix-color-surface-media);
    background-image:
      radial-gradient(ellipse 80% 70% at 50% 0%, color-mix(in oklab, var(--helix-color-primary) 45%, transparent), transparent),
      linear-gradient(to bottom, transparent 55%, color-mix(in oklab, var(--helix-color-primary) 18%, transparent));
    color: var(--helix-color-foreground-media);
    padding: calc(var(--helix-space-2xl) * 2) var(--helix-space-2xl);
    text-align: center;
  }

  .themedLocalHero helix-text[as="h1"] {
    color: inherit;
    max-inline-size: 18ch;
  }

  .themedLocalRating helix-text {
    color: inherit;
  }

  .themedLocalStars {
    color: var(--helix-color-primary);
    display: inline-flex;
    gap: var(--helix-space-2xs);
  }

  .themedLocalSection {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-lg);
    inline-size: 100%;
    margin-inline: auto;
    max-inline-size: var(--themed-measure);
    padding: var(--helix-space-2xl) var(--helix-space-2xl) 0;
    box-sizing: border-box;
  }

  .themedLocalPrice {
    color: var(--helix-color-primary);
  }

  .themedLocalIncludes {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-xs);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .themedLocalIncludes li {
    align-items: center;
    display: flex;
    gap: var(--helix-space-xs);
  }

  .themedLocalIncludes helix-icon {
    color: var(--helix-color-primary);
  }

  /* The steps in a row, each under its number, which is the brand's. */
  .themedLocalSteps {
    display: grid;
    gap: var(--helix-space-lg);
    grid-template-columns: repeat(4, minmax(0, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .themedLocalSteps li {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-sm);
  }

  .themedLocalStepNumber {
    align-items: center;
    background-color: var(--helix-color-primary-subtle);
    border-radius: var(--helix-radii-full);
    block-size: var(--helix-size-control-sm);
    color: var(--helix-color-primary);
    display: inline-flex;
    font-weight: var(--helix-weight-semibold);
    inline-size: var(--helix-size-control-sm);
    justify-content: center;
  }

  .themedLocalVisit {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-block-end: var(--helix-space-2xl);
  }

  .themedLocal .themedFooter {
    margin-block-start: auto;
  }

  @container (width < 52rem) {
    .themedLocalSteps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .themedLocalVisit {
      grid-template-columns: minmax(0, 1fr);
    }

    .themedLocal helix-grid {
      --grid-columns: minmax(0, 1fr);
    }
  }

  @container (width < 30rem) {
    .themedLocalSteps {
      grid-template-columns: minmax(0, 1fr);
    }

    .themedLocalHero,
    .themedLocalSection {
      padding-inline: var(--helix-space-lg);
    }
  }
`
