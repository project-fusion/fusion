import { useState } from 'react'
import './weather.css'

const TILES = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0'

// Radar frames from 50 minutes ago to now, oldest first.
const FRAMES = ['-m50m', '-m40m', '-m30m', '-m20m', '-m10m', ''].map(
  (ago) => `${TILES}/nexrad-n0q-900913${ago}/{z}/{x}/{y}.png`,
)

export function Example() {
  const [playing, setPlaying] = useState(false)

  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* Preview frame: data-preview-map has the frame connect MapLibre and data-preview-map-view sets the view; on your page, connectMap does, and you set the view on your map. */}
      <helix-map
        data-preview-map
        data-preview-map-view="31,-99,5"
        label="Weather radar over Texas"
      >
        <div data-preview-map-canvas></div>

        <helix-map-raster
          attribution="NWS radar from the Iowa Environmental Mesonet"
          description="The last 50 minutes, in 10-minute steps"
          frames={FRAMES}
          label="Weather radar"
          playing={playing}
        ></helix-map-raster>
      </helix-map>

      <helix-flex>
        {/* The loop starts paused on the latest frame, and the button plays and pauses it. */}
        <helix-button onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause radar' : 'Play radar'}
        </helix-button>
      </helix-flex>
    </helix-flex>
  )
}
