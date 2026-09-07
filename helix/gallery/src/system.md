# The drawing system

Bodies only: the `<svg>`, its shared shadow filter and the `aria-hidden` live
in `index.tsx`, so they are stated once rather than ninety-six times.

One drawing per file under `art/`, named for the family it depicts.

The system, which every entry in every one of these files obeys:

-*The viewBox is 1:1 with CSS pixels.** 320 by 200 is a 320 by 200 region of
  a real page, so every size is a token's own value and can be checked against
  `helix/styles/src/tokens.css` rather than argued about. Control 40, tag 24,
  checkbox 20, badge 16, switch 24 by 42, icon 20, header 56, track 4.
-*Radii are 4, 8 and 12.** The seed is `0.5rem`, so that is the ladder.
-*Every color is a semantic token**, through the `art*` classes in
  `gallery.css`. A floating panel is `surface-overlay`, a dimmed page is
  `overlay`, a tooltip is `surface-inverse`. Ink is the one exception and
  stays a percentage of `foreground`, at 0.12, 0.28 or 0.55. Three steps, and
  a fourth is a sign the shape wanted a surface token instead.
-*Monotone throughout.** There is no accent. Emphasis is `artSolid`, which
  is `surface-inverse`: a near-black plate in light and a near-white one in
  dark, carrying `foreground-inverse` for anything on it. Color here was
  only ever saying "this one is emphasized", on about half the grid, which
  weight says as well and more quietly.
-*Every card sits on the same dot lattice**, drawn once in `index.tsx` at
  16 units, which is `space-md`. It shows through the sparse drawings and is
  covered by the dense ones, so the gallery reads as one measured field
  rather than ninety-six unrelated pictures.
-*An edge has to earn its place.** `artEdge` is for a border the component
  actually has (a field, a key cap, a group's shared outline, an unchecked
  box) or for a plane that would otherwise have no silhouette at all. It is
 not* for anything already carrying a permanent shadow: a dialog, a menu, a
  popover, a select's list, a toast and a drilldown's front page were each
  drawing their outline twice, once in shadow and once in hairline, and a
  hairline on a floating panel is the one thing that stops it floating.
-*A drawing depicts what the component is, not what the treatment suggests.**
  A node graph is not a Tree, and browser chrome is not an App Header.
-*One motion archetype per card**, opted into by class, and **nothing moves
  at rest**. Skeleton and Spinner are the tempting exception, their motion
 being* the component; in a grid of ninety-six still cards two that move
  on their own read as the only two that are broken. Both are recognizable
  frozen, so both wait for hover like everything else.
