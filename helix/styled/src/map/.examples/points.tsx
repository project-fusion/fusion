import './points.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre; on your page, connectMap does. */}
      <helix-map
        data-preview-map
        label="Food and drink in Austin"
      >
        <div data-preview-map-canvas></div>

        <helix-map-points
          cluster
          description="Every café, bar and restaurant OpenStreetMap has in Austin"
          label="Food and drink"
          src="/maps/austin-food-and-drink.geojson"
        ></helix-map-points>
      </helix-map>
    </>
  )
}
