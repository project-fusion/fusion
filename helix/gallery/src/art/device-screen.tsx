import type { ReactNode } from 'react'

/**
 * A phone's body and its screen, and a touch on the screen, which is what the
 * family sends back to the device. The app on the screen is the lightest ink
 * there is, because the picture is the consumer's stream and not this
 * library's.
 *
 * The hardware buttons stand in a column beside the device, as the Android
 * Emulator draws them, and the touch ring appears on hover.
 */
export const deviceScreenArt: ReactNode = (
  <>
    <rect className="artSolid" height="176" rx="12" width="96" x="112" y="12" />
    <rect className="artSurface" height="164" rx="8" width="84" x="118" y="18" />

    {/* Somebody else's app, at the lightest ink there is. */}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="44" x="128" y="36" />
    <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="64" x="128" y="56" />
    <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="64" x="128" y="88" />
    <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="64" x="128" y="120" />

    {/* The touch the screen sends. */}
    <circle
      className="artStroke artMotion artMark"
      cx="168"
      cy="100"
      fill="none"
      r="11"
      strokeOpacity="0.55"
      strokeWidth="2"
    />

    {/* The hardware buttons. */}
    <g filter="url(#helixArtShadow)">
      <rect className="artOverlay" height="20" rx="4" width="20" x="224" y="68" />
      <rect className="artOverlay" height="20" rx="4" width="20" x="224" y="96" />
      <rect className="artOverlay" height="20" rx="4" width="20" x="224" y="124" />
    </g>
    <circle className="artInk" cx="234" cy="78" fillOpacity="0.55" r="3" />
    <circle className="artInk" cx="234" cy="106" fillOpacity="0.55" r="3" />
    <circle className="artInk" cx="234" cy="134" fillOpacity="0.55" r="3" />
  </>
)
