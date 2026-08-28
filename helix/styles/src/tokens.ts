/**
 * The semantic token layer, as data.
 *
 * **`tokens.css` is generated from this file**, along with `tokens.json`, by
 * `bun run tokens:build`. It used to be the other way round: the stylesheet was
 * the source and everything that needed to know a token's name parsed CSS to
 * find out, or did not bother.
 *
 * Two things made that untenable at once. The reference document was generated
 * by reading the stylesheet, and the ten Foundations pages were written by a
 * person reading it, which is a source with no reader that can be checked: two
 * token names in those pages did not exist, and a one-line diff found them
 * hours after they shipped. And the authoritative set of names was already
 * split, since `derive()` emits `--helix-seed-*` that appear in no stylesheet,
 * which is what `check:seeds` exists to police.
 *
 * **`@fusion.dev/helix-styles` still ships pure CSS with no JavaScript.** The generated
 * stylesheet is committed, exactly as `elements.css` and every
 * `pages.generated.ts` in this repository already are, so a consumer installs a
 * folder of `.css` files and nothing here reaches them.
 *
 * **A pair, not an object.** A token is a name and a value, and the notes
 * between them are the reasoning, kept as comments in the order they were
 * written so the generated stylesheet reads the way the hand-written one did.
 * An object per token would put a `description` key beside prose that is often
 * about the six tokens after it rather than about one.
 */

/**
 * A token: the name after `--helix-`, the value it resolves to, and what it is
 * for where that has been written down.
 *
 * **The description is optional and a category is described or it is not.** A
 * Foundations page renders a third column only when every token in the category
 * has one, so a half-described category cannot produce a table with holes in
 * it. Five categories are described today, which is the five whose pages
 * carried hand-written description tables; the rest gained nothing from a
 * sentence repeating their name.
 */
export type Token = readonly [name: string, value: string, description?: string]

/**
 * Sets of tokens this design system has a name for.
 *
 * **A category is where a token's name puts it; a group is what the system
 * calls it.** The surface ladder is five tokens from one category and reads as
 * a sequence, and the separation policy is four tokens from two categories that
 * only mean anything as a set. Neither is expressible as a prefix, and both are
 * referred to by name in the prose that explains them.
 *
 * A Foundations page renders one by name, so the page and the system agree
 * about what the ladder is rather than a page listing five tokens it believes
 * belong together.
 */
export const TOKEN_GROUPS: Record<string, string[]> = {
  /* Ordered as a ladder rather than alphabetically: it is a sequence from the
     page outward, and sorting it is the one thing that would stop it reading
     as one. */
  'separation-policy': ['border-surface', 'shadow-surface', 'border-floating', 'shadow-floating'],
  'surface-ladder': [
    'color-background',
    'color-surface',
    'color-surface-raised',
    'color-surface-overlay',
    'color-surface-sunken',
  ],
}

/**
 * Every semantic token, in the order the stylesheet declares them.
 *
 * Order is content here: the surfaces read as a ladder, the sizes read as a
 * scale, and alphabetising them would turn both into a list.
 */
export const TOKENS: Token[] = [
  /* One declaration per token, both modes inside it. Which half resolves is
     decided by `color-scheme` and nothing else, so the color mode is a single
     attribute on the root and no token has to be restated to honor it.

     This replaced three hand-maintained lists: light defaults, an OS-preference
     block, and one block per explicit mode. They drifted, exactly as duplicated
     lists do. Five tokens appeared in the OS block and in neither explicit one,
     so choosing a mode by hand left `surface-sunken`, `overlay`,
     `foreground-subtle` and both material tokens at the other mode's values:
     a segmented control kept its light gray track on a dark page. */
  /* ======================================================== color ======= */
  /* Surfaces, from furthest back to nearest front. */
  /* Depth is distance from the page, in whichever direction there is room.

     The page is #ffffff and #000000, so in light mode there is nothing above
     white to be lifted into: a raised surface has to go down the ramp, not up.
     Both modes therefore step away from the page in the one direction available
     to them, and the ladder is monotonic in both.

     It was not. Moving the page to the ends of the ramp left `background`,
     `surface` and `surface-raised` all sitting on `neutral-0` in light mode:
     three tokens, one color, and a card on a page with nothing between them.

     **The dark page is black, and the ladder moves around it.** It was briefly
     near-black instead, to make room underneath for `sunken`, and that is the
     wrong token to move: the page is the one fixed point either mode has, and
     every other step is defined as a distance from it. Nothing below black is
     the constraint, so `sunken` is what gives way. See its note below. */
  [
    'color-background',
    'light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))',
    'The page. Told apart by nothing, because it is the ground.',
  ],
  [
    'color-surface',
    'light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))',
    'A plane on the page: a card, or a panel you own. Told apart by a fill, an edge or a lift, whichever the policy leads with.',
  ],
  /* Two kinds of "above", and they want opposite fills in light mode.

     `raised` is for something lifted while still lying on the page: a tab's
     selected pill, a segmented control's thumb, a hovered row. It has the page
     on all sides, so it is told apart by its fill, which on white has to be a
     step darker.

     `overlay` is for something over the page rather than on it: a menu, a
     popover, a dialog. It is told apart by its shadow and by the content it
     covers, so on white it is white, which is what a dropdown should look like
     and what every desktop menu does.

     One token tried to be both. Painting it white made the dropdown right and
     took every pill and thumb with it: white on a white page, which is nothing
     at all. In dark they land on the same step, which is why one token got away
     with it for as long as it did. */
  [
    'color-surface-raised',
    'light-dark(var(--_helix-neutral-100), var(--_helix-neutral-800))',
    'Lifted while still lying on the page: a selected tab, a hovered row. Told apart by its fill, which goes down the ramp rather than up.',
  ],
  [
    'color-surface-overlay',
    'light-dark(var(--_helix-neutral-0), var(--_helix-neutral-800))',
    'Over the page rather than on it: a menu, a popover, a dialog. Told apart by its shadow and by what it covers.',
  ],
  /* Down in light, up in dark, because "recessed" is a direction and only one
     of the two modes has room in it.

     In light a well cut through a surface exposes what is under it, so it is
     the deepest of the four and stays a step past `raised`.

     How deep is the part that took a second pass. It sat on neutral-200 at
     0.91, which is the step where the ramp starts opening up, and everything
     filled with it came out as a gray slab on a white page: the checkbox, the
     input, the textarea, the segmented control's track, a selected tab. Five
     reports, one number. Each was patched at the component for a day, which is
     five edits saying the same thing and the clue that none of them was the
     fix. The step moved to 0.94 instead and the patches came out.

     What made the room for that is that a thumb is `overlay` now rather than
     `raised`. `raised` had been asked to be darker than a white page and
     lighter than a groove at once, which on white are opposite directions, and
     it is what pinned this token down at a depth nothing else wanted.

     In dark there is nothing under black. It was at neutral-1000 with the page
     there too, which is the same color: every sunken thing lying on the page
     was painted the page and vanished. Reported on the breadcrumb's hover, and
     never only that, because the announcement, the nav bar's marker, a `<kbd>`
     and an input's fill are all sunken and all sit on the page. The answer is
     that in dark a recess reads by coming toward the viewer rather than away,
     which is what every dark interface does with an input, and which is also
     the only direction left.

     That leaves the toggle group's thumb 0.14 above its track, which has been
     the complaint before. Its shadow is doing the rest of that work now, and
     the component has `--toggle-group-indicator-color` if it needs more: a
     component reaching for a different rung is a normal thing, whereas a page
     that is not the color it was chosen to be is not. */
  [
    'color-surface-sunken',
    'light-dark(var(--_helix-neutral-200), var(--_helix-neutral-950))',
    'A well a value goes into: an input, a track, a groove. Told apart by its fill, inward.',
  ],
  /* **What a field is filled with, stated as a step from its ground rather than
     as a color.**

     A control that names an absolute surface is only correct on the one ground
     it was designed against, and `surface-sunken` was designed against the page.
     Measured as field-to-ground contrast: in light it is 1.119 on the page, 1.073
     on a card and **1.027** on a raised surface, where a field has all but
     vanished; in dark the same token runs 1.067, 1.108 and **1.390**, too faint
     on the page and too heavy on the rung above it. One token, failing in
     opposite directions in the two modes.

     A percentage of the foreground mixed toward transparent is a step away from
     whatever is behind it, in either mode, which a fixed neutral cannot be.
     `Button` had already worked this out for its ghost wash and the argument was
     never about buttons. At 5% it reproduces the current field on the light page
     exactly, 1.119, and then holds: 1.119, 1.112, 1.114 across page, card and
     raised, against the absolute token's 1.027 to 1.119.

     **It composites, which is the point and also the limit.** A translucent fill
     takes the color of what it sits on, so a field over a photograph is tinted
     by the picture rather than legible against it. That case wants an opaque
     ground and says so through the control's own background hook, which
     `check:grounds` exists to guarantee every component publishes.

     Ten controls read this, the resting field box of each. Tracks, grooves,
     swatches, hover washes and chart bands still name `surface-sunken`: they are
     a different job and each has to say which it is rather than being swept. */
  ['color-well', 'color-mix(in oklab, var(--helix-color-foreground) 5%, transparent)'],
  /* Two whole colors, not one color with a `light-dark()` strength.

     This was `color-mix(in oklab, neutral-950 light-dark(40%, 64%),
     transparent)`, and `light-dark()` resolves to a `<color>`: it is not valid
     in a percentage slot. So the declaration was invalid, the token resolved to
     nothing, and every scrim in the library was transparent. It took moving the
     drawer onto `::backdrop` for anyone to see it, because the drawer had drawn
     its own scrim div with its own color and the dialog's was simply missing.

     The mix goes on each arm instead, which is the shape every other two-mode
     token here already has. */
  [
    'color-overlay',
    'light-dark( color-mix(in oklab, var(--_helix-neutral-950) 40%, transparent), color-mix(in oklab, var(--_helix-neutral-950) 64%, transparent) )',
  ],
  /* Text and icons, by prominence. */
  /* The ends of the ramp, matching the page. An icon takes `currentColor` and
     inherits, so this is what a bare one is: black on white and white on black,
     rather than the dark gray and off-white a step in from each. Everything
     that wants to be quieter asks for `-muted` or `-subtle` by name. */
  ['color-foreground', 'light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-0))'],
  ['color-foreground-muted', 'light-dark(var(--_helix-neutral-600), var(--_helix-neutral-400))'],
  /* The quieter of the two secondary inks, and it is still an ink.

     It was `neutral-500` in both modes and failed 4.5:1 on every ground in
     light and on `surface-raised` in dark, while carrying inactive tab labels,
     the pagination summary and the text an input paints. Measured before the
     change: 3.53, 3.62, 3.78, 3.95 in light and 3.59 in dark. */
  ['color-foreground-subtle', 'light-dark(var(--_helix-neutral-550), var(--_helix-neutral-450))'],
  ['color-foreground-on-accent', 'var(--_helix-neutral-0)'],
  /* The mode's opposite, for a surface that has to read as separate from the
     page rather than as part of it: a tooltip, a toast. Both flip together, so
     the pair stays legible in either mode. */
  ['color-surface-inverse', 'light-dark(var(--_helix-neutral-900), var(--_helix-neutral-100))'],
  ['color-foreground-inverse', 'light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))'],
  /* The one pair that does not turn over with the mode.

     Media sits in a dark well in every application that has ever shown any, and
     the bars beside a video that does not fill its box are black rather than
     whatever the page happens to be. `surface-inverse` looks like the token for
     it and is not: it is near-white in dark mode, so a video well came out white
     on a black page and took the light ink of its own control bar with it.

     Both arms are the same value on purpose, said twice rather than written as
     one, so it is visibly a decision and not a token somebody forgot to give a
     second mode. */
  ['color-surface-media', 'light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-1000))'],
  ['color-foreground-media', 'light-dark(var(--_helix-neutral-0), var(--_helix-neutral-0))'],
  /* Lines. One of them.

     Clear of every surface, which is what a rule has to be to be a rule. The
     light pair moved a step out when `surface-sunken` took `neutral-200`: a
     track drawn in the same neutral as its own border has no border.

     **There were three, and two of them were not decisions.**

     `border-accent` resolved to `var(--_helix-brand-500)`, which is what
     `--helix-color-primary` resolves to and what `--helix-color-focus-ring`
     resolves to. Three names, one color, measured identical. A name in front
     of a name is not a token, it is a place for two components to disagree
     about which one to reach for.

     `border-strong` was a hairline moving from 0.91 to 0.71 on hover: a twenty
     point jump in gray that communicates "slightly more" and nothing else. It
     read as the control getting heavier rather than as the control being
     pointed at, and it was the library's only reason to own a second neutral
     line color.

     So: one resting hairline, and interaction is the brand, said as `primary`
     at the seventeen sites that used to say one of the other two. An author now
     answers one question, is this at rest or is it being interacted with,
     rather than picking among three grays that differ by feel.

     `--helix-material-border` further down is not a fourth. It is drawn over a
     translucent pane rather than an opaque surface, so it is a `color-mix` with
     alpha rather than a flat neutral, and no amount of collapsing makes those
     the same value. */
  /* **Softened between the steps, and deliberately not by one.**

     A rule wants to be the quietest thing that is still a rule, and flat 300 and
     700 read as a drawn line rather than an edge. One ramp step in each
     direction is the obvious move and the one thing this cannot do: light lands
     on `neutral-200`, which is `surface-sunken`, and dark on `neutral-800`,
     which is `surface-raised`. That is the fault the note above already records,
     a track drawn in the same neutral as its own border.

     So it lands between the steps, where no surface sits and nothing can
     collide.

     **The two arms are matched on the result, not on the recipe.** Both were
     written as sixty percent of the old value first, and in dark that changed
     almost nothing: the ramp is tighter at that end, 700 to 800 spanning 0.04
     against 300 to 200's 0.05, and the dark line started much further from its
     surface to begin with, 0.12 of lightness against light's 0.075. The same
     nudge was a quarter of the gap in one mode and an eighth in the other, and
     dark stayed close to twice as loud as light.

     So dark is measured from the other side: mixed down from 800 rather than
     across from 700, landing at 0.266 against a 0.21 surface. That is 0.055 of
     separation, which is what light has. The two modes now read as the same
     line rather than as the same arithmetic.

     Still flat and still opaque, which is what keeps it distinct from
     `--helix-material-border`: that one is alpha because it is drawn over
     translucent panes, and this one is not. */
  [
    'color-border',
    'light-dark(color-mix(in oklab, var(--_helix-neutral-300) 60%, var(--_helix-neutral-200)), color-mix(in oklab, var(--_helix-neutral-800) 70%, var(--_helix-neutral-900)))',
  ],
  /* Interaction. */
  ['color-primary', 'light-dark(var(--_helix-brand-500), var(--_helix-brand-400))'],
  ['color-primary-hover', 'light-dark(var(--_helix-brand-600), var(--_helix-brand-300))'],
  ['color-primary-active', 'light-dark(var(--_helix-brand-700), var(--_helix-brand-200))'],
  ['color-primary-subtle', 'light-dark(var(--_helix-brand-50), var(--_helix-brand-900))'],
  /* A fill that carries `--helix-color-foreground-on-accent`, which is the one
     job no accent token in this set was doing.

     **The accents are lightened in dark mode because their main use is text on
     a dark page**, and `foreground-on-accent` is white in both modes, so every
     filled surface in the library failed in dark mode and nothing said so.
     Measured by painting each pair to a canvas and reading the pixels back,
     `getComputedStyle` reporting `oklch(...)` verbatim: primary 2.80, danger
     3.12, info 2.64, success 2.51, warning 1.84. Body text wants 4.5 and large
     text wants 3, so four of the five missed both. Light mode was fine except
     primary at 4.40, which is under 4.5 as well and had not been noticed.

     So a surface does not vary by mode. It is the 600 in both, which is dark
     enough for white anywhere: measured 5.40 for primary and 5.45 to 6.52 for
     the rest, and still 3.29 against a dark surface, above the 3 a UI component
     needs to be seen at all.

     `--helix-color-primary` keeps its `light-dark` and is not the thing to fix:
     twenty-five rules use it as text, where lightening in dark mode is exactly
     right, and eight use it as a fill. One name was doing two jobs. */
  /* The accent, step for step with primary, because a tone that behaves
     differently from the one beside it is a tone a consumer has to learn
     separately. See `--helix-seed-accent-hue` for what it is a relationship to
     and how to break that relationship deliberately. */
  ['color-accent', 'light-dark(var(--_helix-accent-500), var(--_helix-accent-400))'],
  ['color-accent-hover', 'var(--_helix-accent-600)'],
  ['color-accent-active', 'var(--_helix-accent-700)'],
  ['color-accent-subtle', 'light-dark(var(--_helix-accent-50), var(--_helix-accent-900))'],
  ['color-accent-surface', 'var(--_helix-accent-600)'],
  ['color-accent-surface-hover', 'var(--_helix-accent-700)'],
  ['color-primary-surface', 'var(--_helix-brand-600)'],
  ['color-primary-surface-hover', 'var(--_helix-brand-700)'],
  ['color-focus-ring', 'var(--_helix-brand-500)'],
  /* The brand as a mark, which is the one place it appears as itself.

     Everywhere else it is solved for a word: `primary` has to clear 4.5:1 as
     text and `primary-surface` further still to carry white on a fill. A mark
     is a graphic, and WCAG 1.4.11 asks 3:1 of a graphic, so it may sit far
     closer to the color a consumer actually chose.

     **It coincides with `primary` for the seed that ships and diverges under
     derivation**, which is the whole reason it is a token rather than a reuse:
     `@fusion.dev/helix-theme` solves this one against 3 and `primary` against the
     theme's own target, so a brand that has to travel a long way to be readable
     as text travels much less here. A reader who picks a bright yellow and sees
     olive buttons can still find their own color on the page. */
  ['color-brand-mark', 'light-dark(var(--_helix-brand-500), var(--_helix-brand-400))'],
  /* Syntax. What a token in a piece of source is, not what it means to the
     design: `keyword` is a keyword in any language, and a component asking for
     one is asking to highlight code. Shared by the sandbox editor and by any
     code block, so the two cannot drift into different palettes. */
  [
    'color-syntax-callable',
    'light-dark( var(--_helix-syntax-callable-light), var(--_helix-syntax-callable-dark) )',
  ],
  [
    'color-syntax-comment',
    'light-dark( var(--_helix-syntax-comment-light), var(--_helix-syntax-comment-dark) )',
  ],
  [
    'color-syntax-constant',
    'light-dark( var(--_helix-syntax-constant-light), var(--_helix-syntax-constant-dark) )',
  ],
  [
    'color-syntax-invalid',
    'light-dark( var(--_helix-syntax-invalid-light), var(--_helix-syntax-invalid-dark) )',
  ],
  [
    'color-syntax-keyword',
    'light-dark( var(--_helix-syntax-keyword-light), var(--_helix-syntax-keyword-dark) )',
  ],
  [
    'color-syntax-name',
    'light-dark( var(--_helix-syntax-name-light), var(--_helix-syntax-name-dark) )',
  ],
  [
    'color-syntax-string',
    'light-dark( var(--_helix-syntax-string-light), var(--_helix-syntax-string-dark) )',
  ],
  [
    'color-syntax-tag',
    'light-dark( var(--_helix-syntax-tag-light), var(--_helix-syntax-tag-dark) )',
  ],
  /* Status.

     The light half takes the 600 and the dark half the 400, for every severity
     rather than for danger alone. A 500 measures between 2.63 and 3.80 against
     the light surfaces, which is enough for a fill or a mark and short of what
     a word needs, so these tokens could not be used for the thing their names
     most suggest. `Trend` colours an arrow rather than its number because of
     it, and that comment can go now. */
  /* A series is a thing being compared, not a thing being reported.

     Separate from the status colours on purpose: `success` and `danger` mean
     something, and a chart's third line meaning "danger" because it happened to
     land there is hue used as a claim nobody made. These say only "not the
     other one".

     Lightness is written here rather than derived from the seed, and that is
     the correction the first version needed. Rotating hue at a fixed lightness
     makes some steps far paler than others against the same paper, measured at
     1.00 and 1.04 contrast for two of the eight, so each mode states a band
     that clears the surface and the steps alternate inside it.

     **Twenty-four, as eight hues in three tones.** 1 to 8 are as bright as sRGB
     allows the hue to be, 9 to 16 the same hues at a balanced weight, and 17 to
     24 the same hues drained almost to gray.

     **Bright is first because it is the one to reach for**, and because the
     first eight are what a chart of three or four actually gets: a palette
     whose default tone is the quiet one makes every small chart look like it is
     apologising. The balanced set is still there for a page carrying several
     charts at once, where eight vivid lines in one view is too much. A chart of three takes 1 to 3; a chart
     that wants one line loud and the rest quiet takes one from 9 to 16 and the
     rest from 17 to 24.

     **The muted eight are close to each other on purpose and should not be used
     to tell eight things apart.** At chroma 0.05 they are near-greys separated
     only by hue, measured at 0.064 in OKLab, which is below what anybody
     reliably distinguishes. They are a background for something else to stand
     out of.

     **Bright moves lightness and the other two do not**, because for three of
     the eight hues there is no more chroma to be had at the balanced lightness:
     the teal, the cyan and the yellow-green cap at 0.105 there, so a brighter
     variant at the same lightness would be the same color, measured at a
     difference of zero on the first attempt. Bright therefore sits wherever its
     own hue holds the most chroma while still clearing 3:1 against the
     strictest surface, which is a different lightness per hue.

     Even so, the cyan barely separates: base and bright differ by 0.031 in the
     light, the smallest gap in the whole palette, because sRGB has almost no
     headroom there at any lightness. Recorded rather than solved.

     **Chroma is written per series, and they differ because sRGB is not
     chroma-uniform.** One number for all eight was the first version and it was
     a claim the file could not keep: every light series said 0.16, and 5
     painted 0.108, 8 painted 0.121 and 4 painted 0.125, because that chroma is
     outside sRGB at those hues and the browser maps it quietly back in. The
     file said one thing and the screen showed another, with nothing anywhere
     saying so.

     So each is the most its own hue can hold at its own lightness, capped at
     0.17 in the light and 0.16 in the dark so the magenta, which could take
     0.296, does not shout down the cyan, which cannot exceed 0.105. Cyan,
     teal and yellow-green are the three that sRGB will not let be vivid at
     these lightnesses, and they are duller by that much and by no more.

     **A themed seed moves the hues, so these ceilings are exact for the seed
     that ships and approximate for any other.** A brand color rotated far
     enough could push one series back outside the gamut, where the browser maps
     it in as before. That is the cost of deriving a chart palette from one
     color, it is bounded and it degrades quietly rather than breaking, and it
     is worth saying out loud rather than discovering.

     Measured by painting each into a canvas and reading the pixel back, which
     is the only way to get sRGB out of these: `getComputedStyle` returns
     `oklch(...)` verbatim in Chrome, and reading those three numbers as if they
     were RGB is how the first three attempts at this produced contrast figures
     that meant nothing at all.

     Against all three surface tokens, since a chart sits on whichever one its
     card uses. Worst of the eight, per ground:

       light   surface 3.30   raised 3.16   sunken 3.08
       dark    surface 6.16   raised 4.92   sunken 6.83

     So every series clears the 3:1 a graphic needs, and the light end clears it
     by very little. This first read 3.45, measured against `surface` alone and
     reported as though it were the number: the figure was right and the claim
     around it was one ground wide. 3.08 is the one to design against.

     The weakest pair under deuteranopia is 1 and 8 of the balanced eight in the light, and they are
     closer than is comfortable. Eight series is already more than a chart
     should have, and one and eight are the least likely to sit next to each
     other, so it is recorded rather than solved: a chart needing all eight
     distinguishable needs shape or label as well as color, whatever the
     palette does. */
  [
    'color-series-1',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.595 calc(0.221 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.62 calc(0.206 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )',
  ],
  [
    'color-series-2',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.645 calc(0.238 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.645 calc(0.238 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )',
  ],
  [
    'color-series-3',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.625 calc(0.126 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.885 calc(0.179 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )',
  ],
  [
    'color-series-4',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.565 calc(0.295 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.62 calc(0.252 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )',
  ],
  [
    'color-series-5',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.64 calc(0.133 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.815 calc(0.17 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )',
  ],
  [
    'color-series-6',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.63 calc(0.11 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.825 calc(0.144 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )',
  ],
  [
    'color-series-7',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.66 calc(0.277 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.66 calc(0.277 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )',
  ],
  [
    'color-series-8',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.63 calc(0.154 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.895 calc(0.219 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )',
  ],
  [
    'color-series-9',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )',
  ],
  [
    'color-series-10',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.129 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )',
  ],
  [
    'color-series-11',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.105 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )',
  ],
  [
    'color-series-12',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )',
  ],
  [
    'color-series-13',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.108 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )',
  ],
  [
    'color-series-14',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.105 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )',
  ],
  [
    'color-series-15',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )',
  ],
  [
    'color-series-16',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )',
  ],
  /* The quiet eight, and the chroma is 0.07 rather than the 0.05 they shipped
     with.

     **Muted is a treatment, not a license to be indistinguishable.** At 0.05 the
     closest pair of the eight measured 0.070 in OKLab in light and 0.064 in
     dark, against 0.091 and 0.142 for the vivid eight and 0.113 and 0.129 for
     the balanced eight. Half the separation of either, for a band meant to
     carry the same eight things, and eight hues at that little chroma are eight
     greys with an opinion.

     0.07 puts them at 0.095 and 0.096, which is above the vivid band's own
     worst pair, so the quiet set is now at least as separable as the loud one.
     Contrast against the three surfaces is unmoved at 3.45 light and 5.13 dark,
     both over the 3:1 a graphic needs.

     **And it is still the quiet band**, which is the constraint that stopped
     this going further: the balanced eight run 0.105 to 0.145, so there is real
     room between the two and there would not be at 0.08, where the gain flattens
     anyway (0.100 and 0.099, against 0.104 at 0.09). Measured across
     0.046 to 0.10 in both modes. */
  [
    'color-series-17',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )',
  ],
  [
    'color-series-18',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )',
  ],
  [
    'color-series-19',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )',
  ],
  [
    'color-series-20',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )',
  ],
  [
    'color-series-21',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )',
  ],
  [
    'color-series-22',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )',
  ],
  [
    'color-series-23',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )',
  ],
  [
    'color-series-24',
    'light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )',
  ],
  ['color-info', 'light-dark(var(--_helix-info-600), var(--_helix-info-400))'],
  /* Both arms, like every other color here. These were single values, so a
     severity mark kept its light-mode color on a dark surface: measured on an
     inverted toast, danger at 2.85:1 against a 3:1 floor. */
  ['color-success', 'light-dark(var(--_helix-success-600), var(--_helix-success-400))'],
  ['color-warning', 'light-dark(var(--_helix-warning-600), var(--_helix-warning-400))'],
  /* The one severity whose two arms are two steps apart rather than one: `600`
     on a page, `400` on a dark surface. See the primitive, which carries the
     argument. */
  ['color-danger', 'light-dark(var(--_helix-danger-600), var(--_helix-danger-400))'],
  /* Fills that carry `foreground-on-accent`. See `--helix-color-primary-surface`
     for why a surface does not vary by mode. */
  ['color-danger-surface', 'var(--_helix-danger-600)'],
  ['color-danger-surface-hover', 'var(--_helix-danger-700)'],
  ['color-info-surface', 'var(--_helix-info-600)'],
  ['color-info-surface-hover', 'var(--_helix-info-700)'],
  ['color-success-surface', 'var(--_helix-success-600)'],
  ['color-success-surface-hover', 'var(--_helix-success-700)'],
  ['color-warning-surface', 'var(--_helix-warning-600)'],
  ['color-warning-surface-hover', 'var(--_helix-warning-700)'],
  /* ======================================================== space ======= */
  ['space-none', 'var(--_helix-scale-0)'],
  ['space-2xs', 'var(--_helix-scale-1)'],
  ['space-xs', 'var(--_helix-scale-2)'],
  ['space-sm', 'var(--_helix-scale-3)'],
  ['space-md', 'var(--_helix-scale-4)'],
  ['space-lg', 'var(--_helix-scale-6)'],
  ['space-xl', 'var(--_helix-scale-8)'],
  ['space-2xl', 'var(--_helix-scale-12)'],
  ['space-3xl', 'var(--_helix-scale-16)'],
  /* ======================================================== radii ======= */
  ['radii-none', '0'],
  ['radii-sm', 'calc(var(--_helix-seed-radii) * 0.5)'],
  ['radii-md', 'var(--_helix-seed-radii)'],
  ['radii-lg', 'calc(var(--_helix-seed-radii) * 1.5)'],
  ['radii-full', '9999px'],
  /* ======================================================== type ======== */
  ['font-sans', 'var(--_helix-family-sans)', 'Everything, unless it is one of the two below.'],
  ['font-mono', 'var(--_helix-family-mono)', 'Code, and anything that has to line up in a column.'],
  /* Falls back to the sans stack, so a product that never sets a display face
     still renders rather than dropping to a serif default. */
  [
    'font-display',
    'var(--_helix-family-display, var(--_helix-family-sans))',
    'Headings meant to be looked at rather than read. Falls back to the sans face.',
  ],
  /* The body size is `md`, and it is 14.

     **Written down because it was not, which is how it came to be wrong.** It
     was 15, and unlike every other decision in these files that carried no
     reason at all: it arrived in a bulk token commit rather than being argued
     for, and nobody could say afterwards why 15 rather than 14 or 16.

     14 is the size a dense product interface is set at, and it divides. Fifteen
     against `--helix-leading-normal` is a 22.5 pixel line box, and that half
     pixel is not free: it is what made aligning a mark to the middle of a line
     of type fiddly enough to need an optical correction in `Timeline`. Fourteen
     gives 21.

     **Only the bottom of the ramp moved.** `lg` and everything above it are
     headings and were not the thing in question, so they are where they were:
     re-cutting them would have been a change to how every page is set, made
     while answering a question about body copy. `sm` had to move because it was
     14 itself, and a scale with two rungs the same size is a scale with a rung
     missing. */
  ['text-xs', 'var(--_helix-size-12)'],
  ['text-sm', 'var(--_helix-size-13)'],
  ['text-md', 'var(--_helix-size-14)'],
  ['text-lg', 'var(--_helix-size-18)'],
  ['text-xl', 'var(--_helix-size-24)'],
  ['text-2xl', 'var(--_helix-size-32)'],
  ['text-3xl', 'var(--_helix-size-44)'],
  ['weight-regular', '400', 'Body text, and the weight most of a page is set in.'],
  ['weight-medium', '500', 'A label, or a heading that should not shout.'],
  ['weight-semibold', '600', 'A heading, and the heaviest this system goes.'],
  ['leading-tight', '1.2', 'Body text set close, for a short measure.'],
  ['leading-normal', '1.5', 'Body text, and the default a paragraph takes.'],
  ['leading-loose', '1.7', 'Body text set open, for a long measure or a small size.'],
  /* **A heading derives its leading from its size instead of picking a rung,
     because picking is what kept getting it wrong.**

     Every heading took `tight`, and measured against real ink extents rather
     than em boxes, four of them set their own wrapped lines closer together
     than the paragraph beneath them: `title` cleared 5.7px and `subheading`
     7.7 where body clears 8.8, and prose `h5` and `h6` cleared 4.5 and 4.1. A
     ratio does that at small sizes by construction, 1.2 of 18 being less air
     than 1.5 of 14, so the scale inverted exactly where a heading stops being
     much larger than the text under it.

     So the gap is stated rather than the ratio. `0.99em` is the ink the sans
     draws for mixed case, 0.881, plus a tenth of the size as proportional air;
     `0.5rem` is the optical constant on top of it. That gives 9.4, 9.5, 10.0,
     10.6, 11.5 and 11.5 across 13, 14, 18, 24, 32 and 44, monotonic and every
     one of them clear of body. The large end comes in about a pixel from where
     `tight` had it, which is what the small end being right costs.

     **`em` is also what fluid type needs.** A clamped heading spans a range of
     sizes and a ratio gives it one gap across the whole range; this gives it
     the right gap at every point, `em` resolving against the used font size at
     the site of substitution rather than here.

     `tight` keeps its readers and its value: 27 rules take it, and `Radio` and
     `Checkbox` compute box geometry from `text-sm * leading-tight`, so it is a
     control metric now as much as a type one and cannot be regraded for the
     sake of headings. */
  [
    'leading-heading',
    'calc(0.99em + 0.5rem)',
    'Headings, which want less than a paragraph. Written as a length plus an em so it tightens as the type grows.',
  ],
  [
    'tracking-tight',
    '-0.01em',
    'Large type, which needs the letters closer than a paragraph does.',
  ],
  ['tracking-normal', '0', 'Body text, and the default.'],
  ['tracking-wide', '0.02em', 'Small capitals and labels, which need the room.'],
  /* **The eyebrow step, which is a different job from `wide`.** `wide` at 0.02em
     is a nudge, for a label in sentence case that wants a little air. An eyebrow
     is set in capitals, and capitals need more than a nudge: letterforms drawn to
     sit inside words are being asked to stand apart, and at 0.02em they read as a
     mistake rather than as a register. 0.12em is where a short uppercase line
     stops looking cramped and starts looking deliberate, measured against the
     0.18em on the legacy marketing site, which is loose enough that a four-word
     kicker begins to come apart, and `Acceptable use` is two of four. */
  ['tracking-wider', '0.12em', 'An uppercase eyebrow, which needs more room than a label.'],
  /* ======================================================== border ====== */
  ['border-thin', '1px'],
  ['border-thick', '2px'],
  /* **How a surface is told apart from what is behind it, said once.**

     A design language leads with one of four mechanisms, fill, border, shadow
     or space, and until now this library could express none of them: of 68
     border declarations reaching for `--helix-color-border`, eight put the
     *color* behind a hook and **none** put the width behind one. So a border
     could be recoloured and never removed, and the floating surfaces wrote
     `border: none` outright, so one could never be added either. Separation was
     unthemeable in both directions.

     **Two policies rather than one, because the two kinds of surface are not
     the same problem.** A card sits in the flow on a ground the theme knows, so
     how it separates is a style choice. A menu floats over whatever the reader
     scrolled under it, so its elevation is *semantic*: it is the thing saying
     "above". A theme may take a card down to nothing; a floating panel with
     neither edge nor lift is unreadable over content nobody can predict, and it
     is the one failure the engine cannot detect, the ground being unbounded.

     The defaults reproduce exactly what shipped before them: in flow is
     border-first with no lift, floating is shadow-first with no edge. */
  [
    'border-surface',
    'var(--helix-border-thin)',
    'The edge a surface in the flow takes. Zero to go shadow-first.',
  ],
  ['border-floating', '0', 'The edge a surface over content takes.'],
  /* ======================================================== shadow ====== */
  /* Used sparingly. Depth is a hairline border first; shadow is reserved for
     surfaces that genuinely float above the page. */
  ['shadow-none', 'none'],
  /* **The ink is per mode, because the two modes are not the same problem.**

     One value served both, and it could not: a shadow is a dark ink at low
     alpha, which is the whole idea in light mode and close to nothing in dark.
     Measured on an elevated card, the `md` ink over white composites to rgb(230)
     and separates the card at 1.248; over black it composites to rgb(1) and
     separates it at 1.006.

     So the light values come down, since that is the mode where the shadow is
     doing the work and where too much of it reads as a drop rather than a lift.
     The dark values are left where they are: they already show almost nothing,
     and lowering them further would be tuning a thing nobody can see. Dark mode
     separating by *lift* at all is a real gap, and it needs a light ink rather
     than a smaller dark one, which is a bigger change than a number.

     `light-dark()` on the ink rather than on the shadow, because it takes
     colors and a shadow is a length list with a color in it. */
  ['shadow-sm', '0 1px 2px var(--_helix-shadow-ink-sm)'],
  ['shadow-md', '0 4px 12px var(--_helix-shadow-ink-md)'],
  ['shadow-lg', '0 12px 32px var(--_helix-shadow-ink-lg)'],
  /* The lift half of the separation policy above. Paired with
     `--helix-border-surface` and `--helix-border-floating`, and a theme moves
     the pair together: border-first sets the edge and clears the lift, and
     shadow-first does the reverse. */
  [
    'shadow-surface',
    'var(--helix-shadow-none)',
    'The lift a surface in the flow takes. None to go border-first.',
  ],
  ['shadow-floating', 'var(--helix-shadow-lg)', 'The lift a surface over content takes.'],
  /* ======================================================== material ==== */
  /* Translucency and blur: how much of what is behind a thing shows through it.

     **This said "never for flat page content, where it reads as decoration",
     and it was too narrow.** Two things made it so. Material became a theme
     policy rather than a per-component decision, and once a language says it is
     translucent, flat content following it is what makes it a language instead
     of a quirk of two headers. And the library was already doing it: a line
     chart's area is `opacity: 0.16` and a bar chart fades its inactive groups
     to 0.45, both hardcoded, both exactly this idea, neither reading a token.

     So the rule is not where it may be used but what it may be used for: a
     translucency that lets a reader see something they need, a gridline under a
     wash or a page under a header, is the material. A translucency that exists
     to look expensive is the decoration, and no token will tell the two apart.

     **What it costs is the guarantee, and that is the real constraint.**
     Contrast is measured against a known ground and a translucent one is not
     known, so anything reading these ends up `unverifiable` in the audit rather
     than passing. That is a reason to use it where seeing through matters and
     not everywhere. */
  /* The material half of the same policy: how much a surface above content
     admits what is behind it. `app-header` is translucent chrome by design and
     follows this; `megamenu` keeps its own `none`, because a band that sits on
     the page rather than over it is a per-instance choice and turning glass on
     for every one of them would be a visual change nobody asked for. */
  [
    'material-backdrop',
    'blur(var(--helix-material-blur-md)) saturate(1.5)',
    'The wash behind a modal.',
  ],
  /* **The scalar the policy moves, where the others are values it sets.** A
     line chart's area wash, a bar chart's faded group and a header's backdrop
     are the same decision at three scales, and each of them held its own number
     until this existed. Multiplied rather than replaced, so a component keeps
     the strength it was drawn at and the theme moves all of them together: 1 is
     what ships, below 1 is more see-through, above 1 more solid. */
  ['material-opacity', '1', 'How opaque a translucent surface is.'],
  /* **Two facts about glass that no token can express, written where the
     blurs are because they are what a consumer needs before reaching for one.**
     Both were found building a masthead and a menu that share an edge, and
     neither is anything to do with either component.

     **A `backdrop-filter` is clipped to its own element's box, so two of them
     meeting on a line do not agree.** The filter samples only what is behind
     that element, so a short box has less to average and clamps a large radius
     at both edges: measured, a 57 pixel bar took a 32 pixel blur and came out a
     flat wash, while a tall panel hanging off its bottom edge kept the
     structure of what was behind it. The two were then measured meeting exactly,
     57 against 57, and the seam was still plainly visible. Adjacency does not
     fix it and neither does matching the radius. Two surfaces that have to read
     as one sheet of glass have to *be* one element, painted under both.

     **And two translucent layers cannot hand over by fading.** Coverage is not
     additive: measured at the 72% `--helix-material-translucent` carried when
     this was written, the pair came out 92% while both were held, 59% crossed
     halfway, and 45% when the first was released early. The token is 60% now,
     which moves the numbers and not the conclusion: no coverage makes two
     layers hand over without passing through a value that is neither. Every arrangement passes through a value that
     is neither, so a cross-fade between two glass surfaces reads as a flash. The
     way out is for one of them never to have had any, so there is nothing to
     hand over. */
  /* **`translucent` admits more: 60% where it was 72%.**
     The ask was for it to be more see-through rather than a lighter ground, and
     those are different edits. Lightness would mean a different rung, and
     `primitives.css` explains why that is the wrong lever: `neutral-900` is dark
     `surface` *and* light `surface-inverse` *and* this, so moving it drags two
     unrelated roles, and pointing the material at `neutral-800` makes a glass
     panel read as a *lifted surface* rather than as glass. The rung is the
     ground's color. Coverage is how much of it there is, which is what
     "translucent" names.

     **`translucent-strong` stays at 88%, and the gap widening is the point.**
     The two are one optical language at two coverages: `glass` admits what is
     behind it and `frosted` admits less. Moving both together would keep them
     the same distance apart and change nothing about the relationship the names
     describe. */
  ['material-blur-sm', '8px', 'The lightest backdrop blur.'],
  ['material-blur-md', '16px', 'The backdrop blur a modal takes.'],
  ['material-blur-lg', '32px', 'The heaviest backdrop blur.'],
  [
    'material-translucent',
    'color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 30%, transparent )',

    'The translucent ground, for a surface that admits what is behind it.',
  ],
  [
    'material-translucent-strong',
    'color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 88%, transparent )',

    'The heavier translucent ground, for one that admits less.',
  ],
  /* Two whole colors, for both reasons the overlay above gives, and it is the
     same bug: `light-dark()` in `color-mix()`'s percentage slot, sitting two
     tokens below the comment explaining why that cannot work. It only appears
     to work because Lightning CSS rewrites `light-dark()` into its own
     custom-property shim before a browser sees it. Written by hand it collapses
     to the inherited value, so every material header would lose its rule the
     day that transpile stopped.

     And the value was wrong in the direction that mattered. It was white in
     both modes, 40% in light and 12% in dark, which is a specular highlight:
     right along the top edge of a dark pane and useless along the bottom edge
     of a light one. The material header draws its scrolled rule with this, so
     in light mode the rule was white on a white page and the bar never lifted
     at all, while the flat appearance beside it lifted correctly.

     It goes the way every other border in this file goes: dark on light, light
     on dark. Slightly stronger than `--helix-color-border` in light, because it
     is drawn over a translucent pane rather than an opaque one and has the
     content behind it to compete with. */
  [
    'material-border',
    'light-dark( color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent), color-mix(in oklab, var(--_helix-neutral-0) 12%, transparent) )',

    'The edge a translucent surface needs to have any at all.',
  ],
  /* ======================================================== motion ====== */
  ['duration-instant', '0ms'],
  ['duration-fast', 'var(--_helix-ms-120)'],
  ['duration-normal', 'var(--_helix-ms-200)'],
  ['duration-slow', 'var(--_helix-ms-320)'],
  /* `standard` for most state changes, `emphasized` for things entering the
     screen, `decelerate` for things arriving and settling, `spring` for the
     one or two places a gesture should feel physical. */
  ['easing-standard', 'var(--_helix-curve-standard)'],
  ['easing-emphasized', 'var(--_helix-curve-emphasized)'],
  ['easing-decelerate', 'cubic-bezier(0, 0, 0, 1)'],
  ['easing-accelerate', 'cubic-bezier(0.3, 0, 1, 1)'],
  [
    'easing-spring',
    'linear( 0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1 )',
  ],
  /* ======================================================== size ======== */
  ['size-control-md', 'calc(2.5rem * var(--_helix-seed-density))'],
  ['size-control-sm', 'calc(2rem * var(--_helix-seed-density))'],
  /* The height a control is here. The three below are the scale and never
     move; this one is the current step, it inherits, and `data-density` on any
     container changes it for everything inside. A control reads this; a
     control asking for its own size reads the scale directly. */
  ['size-control', 'var(--helix-size-control-md)'],
  /* The type and the inset a control takes at the current density.

     Beside `--helix-size-control` and for the same reason it exists: density has
     to reach inside a shadow root, and a custom property is the only thing that
     crosses one on its own. These were `[data-density="sm"] helix-button::part(button)`
     rules in the base layer, which reach a button on the page and stop one short
     of a button inside another component. */
  ['text-control', 'var(--helix-text-sm)'],
  ['space-control', 'var(--helix-space-md)'],
  ['size-control-lg', 'calc(3rem * var(--_helix-seed-density))'],
  /* **A step either side of whatever step is current**, for a control that is
     deliberately not the same size as its neighbours: a row in a floating panel,
     a caret inside a trigger, the arrows on a carousel. The named steps are the
     scale and never move and the unsuffixed one is the step a region is at, and
     the set had no word for *relative*, so thirty-five stylesheets said `-sm` or
     `-lg` outright, which reads correctly and silently opts the component out of
     density: measured across the three regions, an option row was 32px in all of
     them while the trigger above it went 32, 40, 48.

     **The multipliers are the ramps' own rather than a taste.** `control`,
     `icon` and `checkbox` each step by exactly a fifth, so at the resting
     density these resolve to precisely the tokens they replace and the sweep off
     the fixed steps changed nothing at `md`. `switch`, `tag`, `avatar` and
     `loader` step at 0.833, 0.857, 0.75 and 0.667, so they get no relative pair:
     a multiplier right for none of them would be worse than the absence.

     **`base.css` recomputes these wherever it redeclares the step they read**,
     which is what makes them relative to the region rather than to the document;
     a custom property substitutes at computed-value time, so one resolved on
     `:root` is what every descendant inherits whatever region it is in. This is
     the default for a page in no density region, which is most pages, and losing
     it is not a subtle failure: measured with it absent, a select's caret drew at
     950px and a menu item at 18. See #321 and #331. */
  ['size-control-tight', 'calc(var(--helix-size-control) * 0.8)'],
  ['size-control-loose', 'calc(var(--helix-size-control) * 1.2)'],
  ['size-icon-tight', 'calc(var(--helix-size-icon) * 0.8)'],
  ['size-icon-loose', 'calc(var(--helix-size-icon) * 1.2)'],
  ['size-checkbox-tight', 'calc(var(--helix-size-checkbox) * 0.8)'],
  ['size-checkbox-loose', 'calc(var(--helix-size-checkbox) * 1.2)'],
  /* How wide a button is when it is asked to take a standard width rather than
     its label's. A real decision rather than a convenience: a row of actions
     whose widths follow their words has one button per word length, and the eye
     reads the raggedness as disorder rather than as information. Multiplied by
     the density seed like every other size, so a compact theme narrows it. */
  ['size-button', 'calc(12.5rem * var(--_helix-seed-density))'],
  /* A mark pinned to something else, so it is sized against that rather than
     against a control. */
  ['size-badge', 'calc(1rem * var(--_helix-seed-density))'],
  /* Smaller than a control on purpose: a tag is a label, not something to
     press, and matching control height would make a row of them read as a row
     of buttons. */
  /* An avatar's own scale, and not the control scale it was borrowing.
     A control's height is a touch target; an avatar's is how large the picture
     wants to be, and the two only looked alike. Borrowed, `md` was 40px, which
     is a control's height and reads as a portrait beside a line of text. */
  ['size-avatar', 'var(--helix-size-avatar-md)'],
  ['size-avatar-sm', 'calc(1.5rem * var(--_helix-seed-density))'],
  ['size-avatar-md', 'calc(2rem * var(--_helix-seed-density))'],
  ['size-avatar-lg', 'calc(2.5rem * var(--_helix-seed-density))'],
  /* 24, 28, 32. The step was 20/24/28, which put a tag at `lg` below a tag at
     `md` on the control scale and made the smallest one shorter than the line
     of text it usually sits in. A four-pixel step throughout, so the three read
     as one scale rather than as three separate decisions. */
  ['size-tag', 'var(--helix-size-tag-md)'],
  ['size-tag-lg', 'calc(2rem * var(--_helix-seed-density))'],
  ['size-tag-md', 'calc(1.75rem * var(--_helix-seed-density))'],
  ['size-tag-sm', 'calc(1.5rem * var(--_helix-seed-density))'],
  /* How thick a bar reporting a proportion is drawn.

     A size rather than a border, which is what it was first: two pixels is a
     rule, and a reader takes a rule for a divider and a bar for a quantity. It
     is also the wrong category, and the wrong category is how a token ends up
     changing when something unrelated to it does. Eight follows the density
     seed like every other size here, so a dense region gets a thinner bar
     without the component having a size property to be told about it. */
  ['size-progress', 'calc(0.5rem * var(--_helix-seed-density))'],
  /* And a meter is half again as thick, which is a difference on purpose.

     `Meter` shipped at the progress height, on the argument that the two stand
     beside each other in a panel and a reading that sits differently in each
     reads as two unrelated controls. Rendered side by side that turned out
     backwards: they *are* two unrelated controls, and a reader telling a level
     from a task at a glance is the point rather than the cost. A progress bar is
     thin, transient and one color; a run of meters under it reads as readings.

     The other half is that a meter carries more. A progress bar draws one
     quantity; a meter draws a fill, a mark at each threshold and a band, and at
     eight the marks are hairlines.

     **Sixteen, and the reading that said twelve was measured at the wrong
     corner.** It read as a segmented control at sixteen while the bar still
     wore `radii-full`, where eight pixel round ends made every band between two
     ticks a capsule. At the house corner the segments are rectangles that agree
     with each other, the ticks are unmistakable, and the difference from the
     eight pixel progress bar above it reads as deliberate rather than as
     drift. */
  ['size-meter', 'calc(1rem * var(--_helix-seed-density))'],
  /* Sixteen, twenty, twenty-four: an even four pixels a step.
     `md` was eighteen and `lg` twenty-two, which made the top step two pixels
     while the bottom one was four. Moving `md` up to twenty is what was asked
     for and is what makes that uneven, so `lg` moves with it: a scale whose
     gaps disagree is not a scale, and nothing between twenty and twenty-two is
     a decision anyone would make on purpose. */
  ['size-checkbox', 'var(--helix-size-checkbox-md)'],
  ['size-checkbox-lg', 'calc(1.5rem * var(--_helix-seed-density))'],
  ['size-checkbox-md', 'calc(1.25rem * var(--_helix-seed-density))'],
  ['size-checkbox-sm', 'calc(1rem * var(--_helix-seed-density))'],
  /* Its own step, and one taller than the checkbox at every one of them.
     Twenty, twenty-four, twenty-eight: the same four pixels a step, offset by
     one.

     It read `--helix-size-checkbox` before, which is the wrong thing for it to
     be the same as. A checkbox is a box with a mark in it and is legible at
     twenty; a switch is a track with a thumb *inside* it, so the same twenty
     leaves a sixteen pixel thumb with two pixels of groove around it and the
     whole control reads as a small dash. What the two share is the row they sit
     in, and a switch one step taller than a checkbox is still a control in the
     same row, not a different scale.

     The width is derived from this rather than declared, so the proportion
     holds at every step and through `--switch-block-size` as well. */
  ['size-switch', 'var(--helix-size-switch-md)'],
  ['size-switch-lg', 'calc(1.75rem * var(--_helix-seed-density))'],
  ['size-switch-md', 'calc(1.5rem * var(--_helix-seed-density))'],
  ['size-switch-sm', 'calc(1.25rem * var(--_helix-seed-density))'],
  /* 16, 24, 32. It was 16, 24, 40: the only scale in this file whose two gaps
     disagree, eight then sixteen, so `lg` was two steps away from `md` while
     `md` was one step from `sm`. Every other scale here steps evenly, avatar by
     eight and tag by four, and a spinner is read beside those. `lg` is what
     moved, since the small end is a spinner inside a control and is fixed by
     what it sits in. */
  ['size-loader-md', 'calc(1.5rem * var(--_helix-seed-density))'],
  ['size-loader-sm', 'calc(1rem * var(--_helix-seed-density))'],
  ['size-loader-lg', 'calc(2rem * var(--_helix-seed-density))'],
  ['size-header', 'calc(3.5rem * var(--_helix-seed-density))'],
  /* The current step, which density moves, and the scale it moves along. An
     icon is chrome: in a dense row it has to come down with the rest of it, or
     a 20px mark sits beside 12px text and reads as the loudest thing there. */
  /* Seeded, like every other size in this file, and this was the one scale that
     was not.

     It changes nothing today and that is the point. The seed is a single global
     knob for rescaling the whole system and it sits at `1`; nothing overrides
     it. An unseeded scale is one that would not move when it does, so the fault
     is latent rather than live, and it is only visible by reading the file.

     Not to be confused with density, which was how this was first written up.
     `data-density` switches which *step* is current, and `--helix-size-icon` has
     always been in that list beside control, checkbox, switch and tag: icons
     already follow the region they are in. Measured before changing anything,
     to be sure of which of the two was actually missing. */
  ['size-icon', 'var(--helix-size-icon-md)'],
  ['size-icon-lg', 'calc(1.5rem * var(--_helix-seed-density))'],
  ['size-icon-md', 'calc(1.25rem * var(--_helix-seed-density))'],
  ['size-icon-sm', 'calc(1rem * var(--_helix-seed-density))'],
  ['size-focus-ring', 'var(--helix-border-thick)'],
  ['size-focus-offset', '2px'],
  /* **How far a focus ring reaches past the box it is on**, which is the two
     above added together, because an outline is drawn outside the border edge
     and then pushed out again by its offset.

     It exists because a scrolling region clips it. `overflow-y: auto` computes
     the other axis from `visible` to `auto`, so a component that asked only to
     scroll vertically became a horizontal clipper as well, and any child filling
     its width lost the left and right sides of its ring: measured on the
     drawer's own button, and on menu items, which span their scroller exactly.
     Two lines of ring above and below the control and nothing down the sides,
     which reads as a rendering fault rather than as focus.

     A token rather than the sum written out in each of them, because eight
     components scroll and the ring is one decision. Whoever changes the ring or
     its offset should not have to find the eight. */
  ['size-focus-reach', 'calc(var(--helix-size-focus-ring) + var(--helix-size-focus-offset))'],
  /* ======================================================== layer =======
     Positions in a stack, not components. Every rung answers "how far above the
     page does this sit", which is a question a consumer's own element asks as
     readily as one of ours.

     `--helix-layer-popover` was here at 1100 and is gone. It was the last
     component-named rung, and it had no reader at all: every floating surface
     is in the top layer now, where `z-index` does not apply and the stack is
     ordered by which one opened last. So the token could only ever have been
     read by a consumer trying to sit *between* two of ours, and the number it
     offered them was wrong the moment `popover` stopped using it. A dead rung
     named after a component is worse than an absent one: it reads as a
     guarantee about where that component sits. */
  /* Beneath the content of the box that declares it, and not beneath the page.
     A negative index inside a stacking context reaches its own parent's
     background and stops, which is exactly the job: a decorative field that is a
     *child* of the band it lights has to sit behind that band's words, where the
     same field as a sibling of the bands gets the order for free. The ramp began
     at the document with nothing under it, so the only way to write this was a
     raw -1, which is the thing a token ramp exists to stop. See 251. */
  ['layer-beneath', '-1'],
  ['layer-base', '0'],
  ['layer-raised', '10'],
  ['layer-sticky', '100'],
  ['layer-overlay', '1000'],
  ['layer-toast', '1200'],
]
