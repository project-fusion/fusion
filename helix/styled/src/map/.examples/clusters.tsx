import './clusters.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre; on your page, connectMap does. */}
      <helix-map
        cluster
        data-preview-map
        label="Downtown Austin"
      >
        <div data-preview-map-canvas></div>

        <helix-map-marker
          label="Texas Capitol"
          lat={30.27469}
          lng={-97.74051}
        ></helix-map-marker>
        <helix-map-marker
          label="Houndstooth"
          lat={30.26628}
          lng={-97.74311}
        ></helix-map-marker>
        <helix-map-marker
          label="Eureka"
          lat={30.26776}
          lng={-97.74126}
        ></helix-map-marker>
        <helix-map-marker
          label="Iron Cactus"
          lat={30.26726}
          lng={-97.73948}
        ></helix-map-marker>
        <helix-map-marker
          label="Chez Nous"
          lat={30.2665}
          lng={-97.73854}
        ></helix-map-marker>
        <helix-map-marker
          label="Hoboken Pie"
          lat={30.26821}
          lng={-97.73679}
        ></helix-map-marker>
        <helix-map-marker
          label="Geisha Sushi & Grill"
          lat={30.26641}
          lng={-97.73643}
        ></helix-map-marker>
        <helix-map-marker
          label="The Driskill"
          lat={30.26811}
          lng={-97.74172}
        ></helix-map-marker>
        <helix-map-marker
          label="1886 Café & Bakery"
          lat={30.26811}
          lng={-97.74172}
        ></helix-map-marker>
        <helix-map-marker
          label="Franklin Barbecue"
          lat={30.27014}
          lng={-97.73128}
        ></helix-map-marker>
        <helix-map-marker
          label="Rainey Street"
          lat={30.259}
          lng={-97.73869}
        ></helix-map-marker>
        <helix-map-marker
          label="Congress Avenue Bridge"
          lat={30.26139}
          lng={-97.74529}
        ></helix-map-marker>
      </helix-map>
    </>
  )
}
