# Voice

How we write anything a person using our products reads: the site, the docs,
component reference pages, interface text, error messages, and the JSDoc that
becomes reference pages. New code comments follow the same rules. Existing
comments are rewritten only when the code around them changes.

## The rules

1. **Say what a thing is and what it does.** Start with the subject and the
   verb. One idea per sentence, and keep most sentences short.
2. **No contrast framing.** Do not argue against a position nobody stated.
   Avoid "X, not Y", "rather than", "instead of" and "and not" as a way to make
   a claim sound sharper. State the claim.
3. **Headlines make literal sense to a stranger.** Someone who has never heard
   of the product should learn what it is from the headline alone.
4. **Baselines are not selling points.** Every component is accessible,
   themeable and works in any framework. Do not claim these in taglines,
   feature lists or product descriptions. Document how they work where the
   reader needs instructions, such as which keys move between markers. Helix's
   own introduction and install lines may say once which frameworks it runs
   in, because that is what you install.
5. **Labels name the action and its object.** "Customize the map", "Build your
   theme". Never a bare verb such as "Try it", and avoid "this", which depends
   on where the reader thinks they are.
6. **"You" for the reader, "we" for Fusion.** Not "a reader", "a page" or
   "somebody".
7. **No contractions.** Write "does not" and "you will".
8. **Lists for three or more items.** Do not chain items with commas after a
   colon.
9. **Software is not a character.** Components and libraries do not ask,
   answer, know or want.
10. **Bold is for scanning.** Use it for the one rule a section is about, or for
    the lead of a reference entry. Not every paragraph.
11. **Plain words over clever ones.** A sentence that needs rereading is wrong,
    however well it sounds.
12. **American spelling, sentence-case headings, exact names and numbers.**
    `fusion prose` checks the spelling. Write dates as "September 15, 2026",
    with the month spelled out.
13. **Use the serial comma.** Write "places, routes, and live positions", with a
    comma before the "and" or "or" that ends a list of three or more.

## By surface

| Surface | What it does | Example |
|---|---|---|
| Headline | Names the product or the outcome | Interactive maps in your brand's colors. |
| Lede | One or two sentences of what you can do | Add places, routes, and live positions to a map drawn by MapLibre or Leaflet, styled with your theme. |
| Marketing body | Short facts, no adjectives doing the work | Your brand colors the main roads. Labels meet your contrast target. |
| Guide | Task first, then the example, then why | Install the connector, write the map, then connect it. |
| Reference | What each option does, one line each | `passed`: marks a place as visited. It is drawn muted, and its name ends with "passed". |
| Interface | Action and object, as few words as possible | Customize the map. Press a count to zoom in. |
| Error | What went wrong and what to do | `--helix-color-foreground` is not defined. Load `@fusion.dev/helix-styles`. |

## Before and after

| Before | After |
|---|---|
| Tokens are a function, not a table. | Helix computes your color tokens from a few inputs, such as your brand color. |
| A map that belongs to the page. | Interactive maps in your brand's colors. |
| Maps in your theme that a screen reader can find. | Add places, routes, and live positions to a map, styled with your theme. |
| Helix draws no tiles. `Map` is the frame around a map a renderer draws, MapLibre or Leaflet or one of your own: a named region, pan and zoom as buttons, and the tiles' credit. | Helix Maps puts a frame around a map drawn by MapLibre, Leaflet, or a renderer of your own. The frame adds pan and zoom buttons and a place for the map credit. |
| A place the map knows by its coordinates and a reader knows by its name. | A named place on the map, placed by its latitude and longitude. |
| Try it | Customize the map |
| …so an interface is consistent because there was nothing else to choose. | Every component uses the same tokens, so your interface stays consistent. |
