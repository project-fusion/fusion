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
 * here. The first version of the frame sent the palette and not this, and the
 * page arrived with its tokens correct and no layout at all: the figures stacked
 * one per line instead of running as a row, and the wordmark, an inline `<svg>`
 * carrying no `width` or `height` of its own, rendered at 0x0.
 *
 * **Not `themed-page.css.ts`**, which is what it wanted to be called: `*.css.ts`
 * is the name `bun run styles` generates into and `.gitignore` excludes it
 * repo-wide, so that file would have worked on this machine and existed nowhere
 * else.
 */

/**
 * Identity tag, for the editor and for `check:tokens`.
 *
 * The check reads `` css` ` `` templates out of `.ts` files exactly as it reads
 * whole `.css` files, so the tokens named here are held to the same rule as the
 * ones in `site.css`: no raw values where a token exists, no primitives, and
 * nothing referring to a token that does not exist.
 */
const css = (strings: TemplateStringsArray): string => strings.raw.join('')

export const THEMED_PAGE_STYLES = css`
  /* **The preview paints its own page**, because a theme's background is one of
     the things being previewed.

     Almost nothing is needed for that any more. This rule used to set the
     ground, the ink and the face, and said so with a comment explaining that the
     base layer does it at the document root and a preview is not one. The
     preview is one now, so the base layer's own \`body\` rule sets all three from
     the same tokens the theme has just redefined, and the height and the
     scroller go with them: the frame is the pane, so the document scrolls
     itself. */

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
  .themedPage {
    display: flex;
    flex-direction: column;
    gap: var(--helix-space-2xl);
    padding-block-end: var(--helix-space-2xl);
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

  .themedHero {
    max-inline-size: 46rem;
    padding-inline: var(--helix-space-2xl);
    padding-block-start: var(--helix-space-lg);
  }

  /* The recessed band, so \`surface-sunken\` is on screen beside the others rather
     than being the one ground nobody looks at. Edge to edge, because a band that
     insets is a card. */
  .themedFigures {
    background-color: var(--helix-color-surface-sunken);
    border-block: var(--helix-border-thin) solid var(--helix-color-border);
    display: flex;
    flex-wrap: wrap;
    gap: var(--helix-space-2xl);
    padding: var(--helix-space-lg) var(--helix-space-2xl);
  }

  .themedFeatures,
  .themedChart,
  .themedSplit {
    padding-inline: var(--helix-space-2xl);
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
     unconsidered: on a coloured band the emphatic thing is the pale one. Through
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

  @container (width < 52rem) {
    .themedSplit {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* The header's centre and end collide before the page does: a nav is centred
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
    .themedHero,
    .themedFeatures,
    .themedChart,
    .themedSplit,
    .themedClose,
    .themedFooter {
      padding-inline: var(--helix-space-lg);
    }

    .themedFigures {
      gap: var(--helix-space-lg);
      padding-inline: var(--helix-space-lg);
    }
  }
`
