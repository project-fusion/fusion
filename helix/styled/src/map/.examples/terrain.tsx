import './terrain.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre and data-preview-map-view tilts it; on your page, connectMap does, and you set the view on your map. */}
      <helix-map
        controls="zoom compass tilt layers fullscreen"
        data-preview-map
        data-preview-map-view="37.7300,-119.6100,12.4,60,70"
        label="Yosemite Valley in 3D"
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
        <helix-map-landcover></helix-map-landcover>
        <helix-map-terrain
          attribution="Elevation from 3DEP and SRTM data, courtesy of the U.S. Geological Survey"
          max-zoom="15"
          raised
          src="https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        ></helix-map-terrain>
        <helix-map-contours
          max-zoom="15"
          src="https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
          unit="feet"
        ></helix-map-contours>
      </helix-map>
    </>
  )
}
