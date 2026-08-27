import './unequal-tracks.css'

export function Example() {
  return (
    <helix-grid className="page" gap="lg">
      <p className="rail">26 Aug 2026</p>
      <p className="prose">
        A rail of metadata beside a prose measure, the composition centered so the prose is not.
        Neither track is a fraction of the other, so `columns` and `min` both give the wrong answer:
        both produce equal tracks by design.
      </p>

      <p className="rail">25 Aug 2026</p>
      <p className="prose">
        Set as a custom property rather than an attribute, the track list can be redefined in a
        media query, which is what lets the layout collapse to one column on a narrow screen with no
        script watching a breakpoint.
      </p>
    </helix-grid>
  )
}
