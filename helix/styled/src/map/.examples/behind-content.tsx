import './behind-content.css'

export function Example() {
  return (
    <section className="hero">
      {/* Preview frame: data-preview-map has the frame connect MapLibre, with landmarks: false; on your page, connectMap does. */}
      <helix-map
        credit-placement="bottom-end"
        data-preview-map
        data-preview-map-landmarks="false"
        data-preview-map-view="30.2672,-97.7431,13.5,40,0"
        fill
        gestures="cooperative"
        label="Downtown Austin"
      >
        <div data-preview-map-canvas></div>
      </helix-map>

      <div className="words">
        <helix-text
          as="h2"
          variant="heading"
        >
          Every stop, one map
        </helix-text>
        <helix-text as="p">
          The words decide how tall the hero is, and the map fills whatever that comes to behind
          them.
        </helix-text>
      </div>
    </section>
  )
}
