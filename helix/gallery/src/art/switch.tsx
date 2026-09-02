import type { CSSProperties, ReactNode } from 'react'

/**
 * Width is height times 1.75, exactly, which is what the component computes.
 *
 * One switch, drawn on, and the hover replays the crossing from off. Off and
 * on side by side is a state table: two tracks read as two settings, and the
 * whole point of a switch is that it is *one* thing in one of two states.
 * The motion carries the second state, which is what motion is for here.
 */
export const switchArt: ReactNode = (
  <>
    <rect className="artSolid artMotion artOn" height="24" rx="12" width="42" x="139" y="88" />
    {/* Eighteen, which is the distance between the two knob positions and
        not a round number. The track runs 139 to 181 and the knob is inset
        four, so on sits at 169 and off at 151. At twenty it drove two units
        past the off position and pushed the knob into the track's own end
        cap, which is what reads as an overshoot on the way left. */}
    <g className="artMotion artKnob" style={{ '--art-to': '18px' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <circle className="artOverlay" cx="169" cy="100" r="8" />
      </g>
    </g>
  </>
)
