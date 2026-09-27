import './globe.css'

const OFFICES = [
  { label: 'Austin', lat: 30.2672, lng: -97.7431 },
  { label: 'London', lat: 51.5072, lng: -0.1276 },
  { label: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { label: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { label: 'Sydney', lat: -33.8688, lng: 151.2093 },
]

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre, data-preview-map-globe asks mapLibreStyle for a globe, and data-preview-map-view sets the view; on your page, pass globe: true to mapLibreStyle. */}
      <helix-map
        controls="pan zoom rotate fullscreen"
        data-preview-map
        data-preview-map-globe
        data-preview-map-view="25,-40,1.3"
        label="Offices around the world"
      >
        <div data-preview-map-canvas></div>

        {OFFICES.map((office) => (
          <helix-map-marker
            key={office.label}
            label={office.label}
            lat={office.lat}
            lng={office.lng}
          ></helix-map-marker>
        ))}
      </helix-map>
    </>
  )
}
