import './areas.css'

/** Each sector's corners, latitude first, as the HTML writes them. */
const SECTOR_A = [
  [30.2693, -97.7745],
  [30.2693, -97.77],
  [30.2655, -97.77],
  [30.2655, -97.7745],
] as const
const SECTOR_B = [
  [30.2693, -97.77],
  [30.2693, -97.7655],
  [30.2655, -97.7655],
  [30.2655, -97.77],
] as const
const SECTOR_C = [
  [30.2693, -97.7655],
  [30.27, -97.762],
  [30.2655, -97.7605],
  [30.264, -97.763],
  [30.2655, -97.7655],
] as const

const points = (corners: readonly (readonly [number, number])[]) =>
  corners.map(([lat, lng]) => ({ lat, lng }))

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre; on your page, connectMap does. */}
      <helix-map
        data-preview-map
        label="Search sectors in Zilker Park"
      >
        <div data-preview-map-canvas></div>

        <helix-map-area
          caption="A"
          description="Searched"
          label="Sector A"
          points={points(SECTOR_A)}
          tone="success"
        ></helix-map-area>

        <helix-map-area
          caption="B"
          description="Being searched"
          label="Sector B"
          points={points(SECTOR_B)}
          tone="info"
        ></helix-map-area>

        <helix-map-area
          caption="C"
          caption-placement="outside"
          description="Not yet searched"
          label="Sector C"
          points={points(SECTOR_C)}
          tone="warning"
        ></helix-map-area>
      </helix-map>
    </>
  )
}
