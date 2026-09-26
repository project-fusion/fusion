import './points.css'

/* Stand-in data: a page sets its own collection here, or names a GeoJSON file with `src`. */
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const CENTERS: [number, number][] = [
  [30.2672, -97.7431],
  [30.2849, -97.7341],
  [30.2475, -97.7502],
  [30.2621, -97.7176],
  [30.2991, -97.7042],
]
const PLACES = Array.from({ length: 2400 }, (_, at) => {
  const [lat, lng] = CENTERS[at % CENTERS.length] as [number, number]
  const angle = noise(at + 1) * Math.PI * 2
  const reach = noise(at + 7919) ** 1.5 * 0.03
  return {
    label: `Place ${at + 1}`,
    lat: lat + Math.sin(angle) * reach * 0.86,
    lng: lng + Math.cos(angle) * reach,
  }
})

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre; on your page, connectMap does. */}
      <helix-map
        data-preview-map
        label="Places in Austin"
      >
        <div data-preview-map-canvas></div>

        <helix-map-points
          cluster
          data={PLACES}
          description="2,400 places"
          label="Places"
        ></helix-map-points>
      </helix-map>
    </>
  )
}
