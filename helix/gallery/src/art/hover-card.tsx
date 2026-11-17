import type { ReactNode } from 'react'

/**
 * A line of text with an underlined name, and a card opened below it holding
 * a round picture, a name and two lines: the preview that opens from a link.
 */
export const hoverCardArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="64" x="56" y="52" />
    <rect className="artInk" fillOpacity="0.6" height="8" rx="4" width="56" x="128" y="52" />
    <rect className="artInk" fillOpacity="0.6" height="2" width="56" x="128" y="64" />
    <rect className="artInk" fillOpacity="0.22" height="8" rx="4" width="72" x="192" y="52" />
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="84" rx="8" width="152" x="104" y="76" />
    </g>
    <circle className="artInk" cx="130" cy="102" fillOpacity="0.3" r="12" />
    <rect className="artInk" fillOpacity="0.6" height="8" rx="4" width="64" x="150" y="98" />
    <rect className="artInk" fillOpacity="0.22" height="6" rx="3" width="124" x="118" y="126" />
    <rect className="artInk" fillOpacity="0.22" height="6" rx="3" width="92" x="118" y="140" />
  </>
)
