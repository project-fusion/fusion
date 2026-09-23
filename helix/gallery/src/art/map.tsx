import type { ReactNode } from 'react'

/**
 * The frame, and a map that is plainly somebody else's.
 *
 * **What is drawn is the border and the controls**, because that is the whole
 * of what this family is: Helix ships no tiles, no projection and no network.
 * The map behind them is a few roads and a river at the lightest ink in the
 * system, deliberately unfinished-looking, so the card does not promise a
 * renderer this library does not have.
 *
 * The control cluster sits at the top right where every map puts it, and it is
 * the thing in focus: the buttons are the family's argument, being what a
 * screen reader can find where an arrow key is a bargain with the reader's
 * reading mode.
 */
export const mapArt: ReactNode = (
  <>
    <rect className="artSurface" height="128" rx="8" width="224" x="48" y="36" />
    {/* Somebody else's map, at the lightest ink there is. */}
    <path
      className="artInk"
      d="M48 96h224"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeOpacity="0.12"
      strokeWidth="6"
    />
    <path
      className="artInk"
      d="M120 36v128"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeOpacity="0.12"
      strokeWidth="6"
    />
    <path
      className="artInk"
      d="M200 36v128"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeOpacity="0.12"
      strokeWidth="4"
    />
    <path
      className="artInk"
      d="M48 130c40-6 60 14 92 6s52-26 84-18"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="10"
    />
    {/* The controls, which are the family. */}
    <g className="artMotion artOpen">
      <rect className="artOverlay" height="20" rx="4" width="20" x="228" y="48" />
      <rect className="artOverlay" height="20" rx="4" width="20" x="228" y="72" />
      <rect className="artEdge" height="19" rx="4" width="19" x="228.5" y="48.5" />
      <rect className="artEdge" height="19" rx="4" width="19" x="228.5" y="72.5" />
      <path
        className="artInk"
        d="M234 58h8M238 54v8"
        fillOpacity="0.55"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        className="artInk"
        d="M234 82h8"
        fillOpacity="0.55"
        stroke="currentColor"
        strokeWidth="2"
      />
    </g>
    <rect className="artEdge" height="127" rx="8" width="223" x="48.5" y="36.5" />
  </>
)
