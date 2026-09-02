import type { CSSProperties, ReactNode } from 'react'

export const videoPlaylistArt: ReactNode = (
  <>
    {/* The player, and the set waiting beside it. The one playing is marked
        down its leading edge rather than filled, which is what the row does. */}
    <rect className="artInk" fillOpacity="0.12" height="104" rx="4" width="140" x="28" y="48" />
    <path className="artInk" d="M88 88l20 12-20 12z" fillOpacity="0.4" />
    <rect className="artInk" fillOpacity="0.28" height="20" rx="0" width="140" x="28" y="132" />
    <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="48" />
    <rect
      className="artSolid artMotion artFill"
      height="28"
      rx="3"
      style={{ '--art-grow': 3 } as CSSProperties}
      width="3"
      x="184"
      y="48"
    />
    <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="54" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="60" />
    <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="84" />
    <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="90" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="96" />
    <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="120" />
    <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="126" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="132" />
  </>
)
