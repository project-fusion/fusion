import type { ReactNode } from 'react'

/**
 * Gallery art for the ten families the language was worked out on.
 *
 * Bodies only: the `<svg>` around them lives in `index.tsx`, so the viewBox,
 * the class and the `aria-hidden` are stated once rather than forty-nine times.
 *
 * The system, which every entry in every one of these files obeys:
 *
 * - **The viewBox is 1:1 with CSS pixels.** 320 by 200 is a 320 by 200 region
 *   of a real page, so every size here is a token's own value and can be
 *   checked against `helix/styles/src/tokens.css`. Control 40, tag 24, checkbox
 *   20, badge 16, switch 24 by 42, icon 20, header 56.
 * - **Radii are 4, 8, 12 and full.** The seed is `0.5rem`, so that is the whole
 *   ladder.
 * - **Alpha is a five step ramp**: 0.06, 0.12, 0.28, 0.55, 0.82.
 * - **A background plane appears only where the component paints one.** Tabs
 *   is the case that made this a rule: its default is a raised pill on the
 *   selected tab "and nothing at all behind the row", with `--_tabs-rule: none`.
 * - **Six shapes maximum**, unless repetition is the subject.
 */
export const coreArt: Record<string, ReactNode> = {
  /** Items flush against each other, one hairline between neighbours. */
  accordion: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="88" x="68" y="44" />
      <rect className="artFg" fillOpacity="0.28" height="1" width="224" x="48" y="66" />
      <rect className="artFg" fillOpacity="0.82" height="8" rx="4" width="104" x="68" y="86" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="160" x="68" y="112" />
      <rect className="artFg" fillOpacity="0.28" height="1" width="224" x="48" y="142" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="72" x="68" y="162" />
    </>
  ),

  /** A 16 pixel mark pinned at 45 degrees, held off by a ring of the page. */
  badge: (
    <>
      <circle className="artFg" cx="160" cy="104" fillOpacity="0.12" r="40" />
      <circle className="artSurface" cx="188" cy="76" r="12" />
      <circle className="artFg" cx="188" cy="76" fillOpacity="0.82" r="8" />
    </>
  ),

  /** One control at 40, three times, gaining weight as it comes forward. */
  button: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="120" x="80" y="58" />
      <rect className="artFg" fillOpacity="0.28" height="40" rx="4" width="120" x="100" y="76" />
      <rect className="artFg" fillOpacity="0.82" height="40" rx="4" width="120" x="120" y="94" />
    </>
  ),

  /** Two surfaces at radius 8, and the third tone is their overlap. */
  card: (
    <>
      <rect className="artFg" fillOpacity="0.06" height="104" rx="8" width="176" x="48" y="40" />
      <rect className="artFg" fillOpacity="0.06" height="104" rx="8" width="176" x="96" y="72" />
      <rect className="artFg" fillOpacity="0.55" height="32" rx="4" width="64" x="192" y="128" />
    </>
  ),

  /** A 40 pixel field at radius 4, sunken, with a caret in it. */
  input: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="56" x="48" y="52" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="224" x="48" y="72" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="88" x="64" y="88" />
      <rect className="artFg" fillOpacity="0.82" height="20" width="2" x="160" y="82" />
    </>
  ),

  /** Two keys at their real height, with the depth on the inside. */
  kbd: (
    <>
      {[128, 168].map((x) => (
        <g key={x}>
          <rect className="artFg" fillOpacity="0.12" height="24" rx="4" width="24" x={x} y="88" />
          <rect
            className="artFg"
            fillOpacity="0.28"
            height="3"
            rx="1.5"
            width="22"
            x={x + 1}
            y="107"
          />
          <rect
            className="artFg"
            fillOpacity="0.55"
            height="4"
            rx="2"
            width="12"
            x={x + 6}
            y="97"
          />
        </g>
      ))}
    </>
  ),

  /**
   * A 40 pixel avatar and two lines, at 40% and 70% of the row.
   *
   * The shapes are declared once and drawn twice, flat and then under the
   * sweep, because `fill` inherits into a `<use>` shadow tree. That is what
   * keeps the sweep on the placeholder rather than across the whole card, and
   * why the shapes in `defs` carry no fill of their own.
   *
   * The inequality is load-bearing: two bars of the same length read as a
   * pattern, and a reader waiting on content reads a pattern as decoration
   * rather than as something about to be replaced.
   */
  skeleton: (
    <>
      <defs>
        <g id="componentArtSkeleton">
          <circle cx="76" cy="100" r="20" />
          <rect height="14" rx="7" width="64" x="112" y="86" />
          <rect height="14" rx="7" width="112" x="112" y="108" />
        </g>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="componentArtSkeletonSweep"
          x1="40"
          x2="220"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--helix-color-foreground)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <use className="artFg" fillOpacity="0.12" href="#componentArtSkeleton" />
      <use fill="url(#componentArtSkeletonSweep)" href="#componentArtSkeleton" />
    </>
  ),

  /**
   * A 20 pixel thumb lifted off a 4 pixel track.
   *
   * The thumb is `artSurface` inside a faint disc rather than a hole cut in the
   * track: the real one is `surface-overlay` under `shadow-md`, an object
   * sitting on the track. The halo is what gives it an edge, there being no
   * strokes anywhere in this set.
   */
  slider: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="4" rx="2" width="224" x="48" y="98" />
      <rect className="artFg" fillOpacity="0.55" height="4" rx="2" width="104" x="48" y="98" />
      <circle className="artSurface" cx="96" cy="100" fillOpacity="0.55" r="10" />
      <circle className="artFg" cx="152" cy="100" fillOpacity="0.12" r="16" />
      <circle className="artSurface" cx="152" cy="100" r="10" />
    </>
  ),

  /**
   * A raised pill on the selected tab and nothing at all behind the row.
   *
   * The pill is the palest thing here and the label the heaviest, because the
   * real pill is `surface-raised` under `shadow-sm`: it is lifted, not filled.
   */
  tabs: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="80" x="120" y="80" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="36" x="62" y="96" />
      <rect className="artFg" fillOpacity="0.82" height="8" rx="4" width="36" x="142" y="96" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="36" x="222" y="96" />
    </>
  ),

  /** Three appearances at the real 24 pixel tag height, as three weights. */
  tag: (
    <>
      {[
        { box: 0.06, label: 0.28, x: 48 },
        { box: 0.12, label: 0.55, x: 124 },
        { box: 0.28, label: 0.82, x: 200 },
      ].map((chip) => (
        <g key={chip.x}>
          <rect
            className="artFg"
            fillOpacity={chip.box}
            height="24"
            rx="4"
            width="72"
            x={chip.x}
            y="88"
          />
          <rect
            className="artFg"
            fillOpacity={chip.label}
            height="8"
            rx="4"
            width="36"
            x={chip.x + 18}
            y="96"
          />
        </g>
      ))}
    </>
  ),
}
