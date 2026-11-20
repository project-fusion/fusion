import './satellite.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre and data-preview-map-view tilts it; on your page, connectMap does, and you set the view on your map. */}
      <helix-map
        controls="zoom compass tilt layers fullscreen"
        data-preview-map
        label="Downtown Austin from above"
        map-type="hybrid"
        view="30.2672,-97.7431,15.6,50,-17"
      >
        <div data-preview-map-canvas></div>

        <helix-map-raster
          attribution="Imagery from USGS The National Map"
          ground
          label="Satellite imagery"
          max-zoom="16"
          opacity={1}
          src="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
        ></helix-map-raster>
        <helix-map-buildings></helix-map-buildings>
      </helix-map>
    </>
  )
}
